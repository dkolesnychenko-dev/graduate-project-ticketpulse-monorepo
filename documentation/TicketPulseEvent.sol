// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TicketPulseEvent
 * @notice NFT-ticket contract for a single event.
 *
 * ── Lifecycle phases (block.timestamp) ─────────────────────────────────────
 *   Phase 1 – Sale    : creation  → startTime   (primary + secondary market)
 *   Phase 2 – Active  : startTime → endTime     (all market ops frozen)
 *   Phase 3 – Completed: after endTime           (withdrawals unlocked)
 *
 * ── Secondary market ───────────────────────────────────────────────────────
 *   Two FIFO queues (sell / buy) with fixed resale price =
 *   nominalPrice × (100 + markupPct) / 100.
 *   Royalty is deducted from the full resale price.
 */

interface ITicketPulseFactory {
    function baseExternalUrl() external view returns (string memory);
}

contract TicketPulseEvent is ERC721, ReentrancyGuard {
    using Strings for uint256;
    using Strings for address;

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────
    error AlreadyInitialized();
    error NotOrganizer();
    error EventNotInSalePhase();
    error EventStarted();
    error EventNotEnded();
    error SoldOut();
    error WalletLimitExceeded();
    error IncorrectPayment();
    error NotTicketOwner();
    error TicketAlreadyListed();
    error TicketNotListed();
    error NoBuyOrder();
    error NoSellOrder();
    error BuyOrderNotOwner();
    error BuyOrderAlreadyMatched();
    error NothingToWithdraw();
    error TransferFailed();
    error InvalidParams();
    error MaxBatchExceeded();
    error InsufficientGasForQueueScan();
    error DirectTransfersDisabled();
    error AlreadyInBuyQueue();

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────
    uint256 public constant MAX_BATCH_SIZE = 6;
    uint256 public constant MAX_ROYALTY_PCT = 20;
    uint256 public constant MAX_MARKUP_PCT = 100;
    uint256 public constant MAX_SUPPLY_CAP = 10_000_000;
    uint256 public constant MAX_WALLET_CAP = 6;
    uint256 private constant _BASIS = 100;
    uint256 private constant GAS_BUFFER = 50_000;

    // ──────────────────────────────────────────────
    //  Event parameters (set once on initialize)
    // ──────────────────────────────────────────────
    bool private _initialized;

    address public organizer;
    address public factory;

    uint64 public startTime;
    uint64 public endTime;

    uint256 public nominalPrice; // wei
    uint32 public maxSupply;
    uint8 public maxTicketsPerWallet;

    uint8 public royaltyPct; // 0-20
    uint8 public markupPct; // 0-100
    uint256 public secondaryPrice; // computed once on initialize

    // On-chain metadata (needed by tokenURI / contractURI / wallets)
    string public title;
    string public ticketType;
    string public ticketSymbol;
    string public ipfsCoverImageCid;

    // ──────────────────────────────────────────────
    //  Minting state
    // ──────────────────────────────────────────────
    uint256 private _nextTokenId; // starts at 1
    uint32 public totalMinted;

    // ──────────────────────────────────────────────
    //  Per-ticket data
    // ──────────────────────────────────────────────
    mapping(uint256 => bytes32) public identityHash; // tokenId → hash

    // ──────────────────────────────────────────────
    //  Financial balances — primary market
    // ──────────────────────────────────────────────
    uint256 public organizerPrimaryBalance;
    uint256 public organizerRoyaltyBalance;

    // seller address → amount claimable (pull pattern)
    mapping(address => uint256) public sellerBalance;

    // ──────────────────────────────────────────────
    //  Secondary-market FIFO queues
    // ──────────────────────────────────────────────

    // --- Sell queue ---
    struct SellOrder {
        uint256 tokenId;
        address seller;
    }

    uint256 public sellHead;
    uint256 public sellTail;
    mapping(uint256 => SellOrder) public sellQueue;
    mapping(uint256 => uint256) private _sellIndex; // tokenId → queue index

    // --- Buy queue ---
    struct BuyOrder {
        address buyer;
        bytes32 newIdentityHash;
        uint256 amountLocked;
    }

    uint256 private _buyOrderCounter;
    uint256 public buyHead;
    uint256 public buyTail;
    mapping(uint256 => BuyOrder) public buyQueue;
    mapping(address => uint256) public activeBuyOrderId; // buyer → queue index

    // ──────────────────────────────────────────────
    //  Events (for The Graph indexing)
    // ──────────────────────────────────────────────

    event EventInitialized(
        address indexed organizer,
        uint64 startTime,
        uint64 endTime,
        uint256 nominalPrice,
        uint32 maxSupply,
        uint8 maxTicketsPerWallet,
        uint8 royaltyPct,
        uint8 markupPct,
        uint256 secondaryPrice,
        string title,
        string ticketType,
        string ticketSymbol,
        string ipfsCoverImageCid,
        string ipfsMetadataCid, // off-chain source-of-truth; NOT in state
        string location // off-chain metadata; NOT in state
    );

    event TicketMinted(address indexed buyer, uint256 indexed tokenId, uint256 price, bytes32 identityHash);

    event SellOrderCreated(uint256 indexed sellOrderId, uint256 indexed tokenId, address indexed seller, uint256 price);

    event SellOrderCancelled(uint256 indexed sellOrderId, uint256 indexed tokenId, address indexed seller);

    event BuyOrderCreated(
        uint256 indexed buyOrderId, address indexed buyer, uint256 amountLocked, bytes32 identityHash
    );

    event BuyOrderCancelled(uint256 indexed buyOrderId, address indexed buyer, uint256 refundedAmount);

    /**
     * @dev Emitted on every successful FIFO match.
     *
     *  The Graph derives all secondary-market statistics from this event:
     *    totalSecondaryVolume     += price
     *    totalRoyaltiesCollected  += royaltyAmount
     *    totalResales             += 1
     *
     *  None of those counters are kept in contract storage.
     */
    event OrderMatched(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 royaltyAmount,
        uint256 sellerReceived,
        uint256 sellOrderId,
        uint256 buyOrderId,
        bytes32 newIdentityHash
    );

    event QueueGasLimitReached(bool isBuyQueue);
    event OrganizerPrimaryWithdrawal(address indexed organizer, uint256 amount);
    event OrganizerRoyaltyWithdrawal(address indexed organizer, uint256 amount);
    event SellerWithdrawal(address indexed seller, uint256 amount);

    // ──────────────────────────────────────────────
    //  Constructor (disabled for clones)
    // ──────────────────────────────────────────────
    constructor() ERC721("", "") {
        _initialized = true; // block initialize on the implementation contract
    }

    // ──────────────────────────────────────────────
    //  Initializer (called once per clone by the factory)
    // ──────────────────────────────────────────────
    struct InitParams {
        address organizer;
        uint64 startTime;
        uint64 endTime;
        uint256 nominalPrice;
        uint32 maxSupply;
        uint8 maxTicketsPerWallet;
        uint8 royaltyPct;
        uint8 markupPct;
        string title;
        string ticketType;
        string ticketSymbol;
        string ipfsCoverImageCid;
        string ipfsMetadataCid; // logged only
        string location; // logged only
    }

    function initialize(InitParams calldata p) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        // ── Validations ────────────────────────────────────────────────────
        if (p.organizer == address(0)) revert InvalidParams();
        if (p.startTime <= block.timestamp) revert InvalidParams();
        if (p.endTime <= p.startTime) revert InvalidParams();
        if (p.nominalPrice == 0) revert InvalidParams();
        if (p.maxSupply == 0 || p.maxSupply > MAX_SUPPLY_CAP) {
            revert InvalidParams();
        }
        if (p.maxTicketsPerWallet == 0 || p.maxTicketsPerWallet > MAX_WALLET_CAP) revert InvalidParams();
        if (p.royaltyPct > MAX_ROYALTY_PCT) revert InvalidParams();
        if (p.markupPct > MAX_MARKUP_PCT) revert InvalidParams();

        // ── State writes ───────────────────────────────────────────────────
        organizer = p.organizer;
        factory = msg.sender;
        startTime = p.startTime;
        endTime = p.endTime;
        nominalPrice = p.nominalPrice;
        maxSupply = p.maxSupply;
        maxTicketsPerWallet = p.maxTicketsPerWallet;
        royaltyPct = p.royaltyPct;
        markupPct = p.markupPct;
        secondaryPrice = (p.nominalPrice * (uint256(_BASIS) + p.markupPct)) / _BASIS;

        title = p.title;
        ticketType = p.ticketType;
        ticketSymbol = p.ticketSymbol;
        ipfsCoverImageCid = p.ipfsCoverImageCid;

        _nextTokenId = 1;
        sellHead = 1;
        sellTail = 1;
        buyHead = 1;
        buyTail = 1;

        emit EventInitialized(
            p.organizer,
            p.startTime,
            p.endTime,
            p.nominalPrice,
            p.maxSupply,
            p.maxTicketsPerWallet,
            p.royaltyPct,
            p.markupPct,
            secondaryPrice,
            p.title,
            p.ticketType,
            p.ticketSymbol,
            p.ipfsCoverImageCid,
            p.ipfsMetadataCid,
            p.location
        );
    }

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────
    modifier onlyOrganizer() {
        if (msg.sender != organizer) revert NotOrganizer();
        _;
    }

    modifier onlySalePhase() {
        if (block.timestamp >= startTime) revert EventNotInSalePhase();
        _;
    }

    modifier onlyAfterEnd() {
        if (block.timestamp < endTime) revert EventNotEnded();
        _;
    }

    // ──────────────────────────────────────────────
    //  ERC-721 overrides
    // ──────────────────────────────────────────────

    function name() public view override returns (string memory) {
        return title;
    }

    function symbol() public view override returns (string memory) {
        return ticketSymbol;
    }

    /**
     * @dev Block all direct user-initiated transfers.
     *      Tickets can only move through the marketplace (_matchOrder) to
     *      enforce royalty collection on every resale.
     *      Mints (from == address(0)) and internal marketplace transfers
     *      (auth == address(0)) are still allowed.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && auth != address(0)) {
            revert DirectTransfersDisabled();
        }
        return super._update(to, tokenId, auth);
    }

    // ──────────────────────────────────────────────
    //  PRIMARY MARKET — Mint
    // ──────────────────────────────────────────────

    /**
     * @notice Mint tickets on the primary market.
     * @param identityHashes Keccak-256 hashes of EIP-712 signatures,
     *                       one per ticket being minted.
     *
     * @dev totalPrimaryVolume is NOT stored on-chain.
     *      The Graph reconstructs it by summing `price` from all
     *      TicketMinted events for this contract address.
     */
    function mintTickets(bytes32[] calldata identityHashes) external payable onlySalePhase nonReentrant {
        uint256 qty = identityHashes.length;
        if (qty == 0 || qty > MAX_BATCH_SIZE) revert MaxBatchExceeded();
        if (totalMinted + qty > maxSupply) revert SoldOut();

        // Fix: Account for pending buy orders to prevent max wallet limit bypass
        uint256 pendingBuy = activeBuyOrderId[msg.sender] != 0 ? 1 : 0;
        if (balanceOf(msg.sender) + pendingBuy + qty > maxTicketsPerWallet) {
            revert WalletLimitExceeded();
        }
        if (msg.value != nominalPrice * qty) revert IncorrectPayment();

        // Effects
        organizerPrimaryBalance += msg.value;

        for (uint256 i; i < qty;) {
            uint256 tokenId = _nextTokenId++;
            totalMinted++;

            identityHash[tokenId] = identityHashes[i];

            _mint(msg.sender, tokenId); // auth == address(0) → allowed by _update

            emit TicketMinted(msg.sender, tokenId, nominalPrice, identityHashes[i]);

            unchecked {
                ++i;
            }
        }
    }

    // ──────────────────────────────────────────────
    //  SECONDARY MARKET — Sell side
    // ──────────────────────────────────────────────

    /**
     * @notice List a ticket for sale.
     *         If a pending buy order exists the match happens atomically.
     */
    function listForSale(uint256 tokenId) external onlySalePhase nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTicketOwner();
        if (_sellIndex[tokenId] != 0) revert TicketAlreadyListed();

        (bool found, bool gasLimitReached) = _hasPendingBuyOrder();

        if (found) {
            _matchWithBuyer(tokenId, msg.sender);
        } else if (gasLimitReached) {
            // Queue was too clogged, cleaned up part of it but hit gas limit.
            // Do not list to avoid breaking FIFO (valid buy orders might still exist).
            return;
        } else {
            uint256 idx = sellTail++;
            sellQueue[idx] = SellOrder({tokenId: tokenId, seller: msg.sender});
            _sellIndex[tokenId] = idx;

            emit SellOrderCreated(idx, tokenId, msg.sender, secondaryPrice);
        }
    }

    /**
     * @notice Cancel a sell listing before it is matched.
     */
    function cancelSellOrder(uint256 tokenId) external onlySalePhase nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTicketOwner();
        uint256 idx = _sellIndex[tokenId];
        if (idx == 0) revert TicketNotListed();

        delete sellQueue[idx];
        delete _sellIndex[tokenId];

        emit SellOrderCancelled(idx, tokenId, msg.sender);
    }

    // ──────────────────────────────────────────────
    //  SECONDARY MARKET — Buy side
    // ──────────────────────────────────────────────

    /**
     * @notice Place a buy order with locked ETH.
     *         If a sell order exists, match happens atomically.
     */
    function placeBuyOrder(bytes32 newIdentityHash_) external payable onlySalePhase nonReentrant {
        if (msg.value != secondaryPrice) revert IncorrectPayment();
        if (balanceOf(msg.sender) + 1 > maxTicketsPerWallet) {
            revert WalletLimitExceeded();
        }
        if (activeBuyOrderId[msg.sender] != 0) revert AlreadyInBuyQueue();

        (bool found, bool gasLimitReached) = _hasPendingSellOrder();

        if (found) {
            _matchWithSeller(msg.sender, newIdentityHash_, msg.value);
        } else if (gasLimitReached) {
            // Refund the user's ETH since we didn't match and won't enqueue.
            // This prevents the "gas trap" where a user pays to clean the queue
            // but gets stuck in the buy queue while tickets are still available.
            (bool ok,) = msg.sender.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
            return;
        } else {
            uint256 orderId = ++_buyOrderCounter;
            uint256 idx = buyTail++;
            buyQueue[idx] = BuyOrder({buyer: msg.sender, newIdentityHash: newIdentityHash_, amountLocked: msg.value});
            activeBuyOrderId[msg.sender] = idx;

            emit BuyOrderCreated(orderId, msg.sender, msg.value, newIdentityHash_);
        }
    }

    /**
     * @notice Cancel buy order and refund locked ETH.
     *         Available at any phase (including after event end) so that
     *         stranded funds can always be recovered.
     */
    function cancelBuyOrder() external nonReentrant {
        uint256 idx = activeBuyOrderId[msg.sender];
        if (idx == 0) revert NoBuyOrder();

        BuyOrder memory order = buyQueue[idx];
        if (order.buyer != msg.sender) revert BuyOrderNotOwner();
        if (order.amountLocked == 0) revert BuyOrderAlreadyMatched();

        uint256 refund = order.amountLocked;

        // Effects first (CEI)
        delete buyQueue[idx];
        delete activeBuyOrderId[msg.sender];

        // Interaction
        (bool ok,) = msg.sender.call{value: refund}("");
        if (!ok) revert TransferFailed();

        emit BuyOrderCancelled(idx, msg.sender, refund);
    }

    // ──────────────────────────────────────────────
    //  MATCHING ENGINE (internal)
    // ──────────────────────────────────────────────

    /**
     * @dev Seller lists → buyer already in queue. Immediate match.
     *      Seller is msg.sender so ETH can be pushed directly (CEI safe,
     *      re-entrancy guard active).
     *
     * Statistics emitted via OrderMatched; The Graph accumulates:
     *   totalSecondaryVolume    += price
     *   totalRoyaltiesCollected += royaltyAmount
     *   totalResales            += 1
     */
    function _matchWithBuyer(uint256 tokenId, address seller) private {
        (uint256 buyIdx, BuyOrder memory bo) = _popBuyOrder();

        uint256 price = bo.amountLocked;
        uint256 royalty = (price * royaltyPct) / _BASIS;
        uint256 sellerPayout = price - royalty;

        // Effects
        organizerRoyaltyBalance += royalty;

        identityHash[tokenId] = bo.newIdentityHash;
        delete activeBuyOrderId[bo.buyer];

        // NFT transfer (internal call, bypasses _update auth check)
        _transfer(seller, bo.buyer, tokenId);

        emit OrderMatched(
            tokenId,
            seller,
            bo.buyer,
            price,
            royalty,
            sellerPayout,
            0, // sellOrderId — not queued in this path
            buyIdx,
            bo.newIdentityHash
        );

        // Interaction: push ETH to seller (msg.sender == seller, CEI safe)
        (bool ok,) = seller.call{value: sellerPayout}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @dev Buyer places order → seller already in queue. Immediate match.
     *      Buyer is msg.sender; seller funds go to sellerBalance (pull
     *      pattern) because seller is not the current call originator.
     */
    function _matchWithSeller(address buyer, bytes32 newIdHash, uint256 payment) private {
        (uint256 sellIdx, SellOrder memory so) = _popSellOrder();

        uint256 royalty = (payment * royaltyPct) / _BASIS;
        uint256 sellerPayout = payment - royalty;

        // Effects
        organizerRoyaltyBalance += royalty;
        sellerBalance[so.seller] += sellerPayout;
        // NOTE: off-chain stats intentionally NOT updated in storage.

        identityHash[so.tokenId] = newIdHash;
        delete _sellIndex[so.tokenId];

        _transfer(so.seller, buyer, so.tokenId);

        emit OrderMatched(
            so.tokenId,
            so.seller,
            buyer,
            payment,
            royalty,
            sellerPayout,
            sellIdx,
            0, // buyOrderId — not queued in this path
            newIdHash
        );
    }

    // ──────────────────────────────────────────────
    //  Queue helpers — with gasleft() guard
    // ──────────────────────────────────────────────

    /**
     * @dev Advance buyHead past cancelled / empty entries.
     *      Returns true if a valid entry is found before gas runs low.
     *
     *      gasleft() guard: before each head advancement we check that at
     *      least GAS_BUFFER (50 000) gas remains.  If not, we emit
     *      QueueGasLimitReached so The Graph can surface the event as a
     *      QUEUE_BATCH_CLEANUP activity, and we return false.  The caller
     *      (listForSale / placeBuyOrder) will then enqueue rather than
     *      match, which is safe; the next transaction will continue the
     *      cleanup from the updated head position.
     */
    function _hasPendingBuyOrder() private returns (bool found, bool gasLimitReached) {
        while (buyHead < buyTail) {
            if (buyQueue[buyHead].amountLocked > 0) return (true, false);

            // Stale entry — check gas before advancing
            if (gasleft() < GAS_BUFFER) {
                emit QueueGasLimitReached(true);
                return (false, true);
            }
            buyHead++;
        }
        return (false, false);
    }

    /**
     * @dev Pop the first valid buy order from the queue.
     *      Reverts with NoBuyOrder if no valid entry is found or gas runs low.
     *      Must only be called after _hasPendingBuyOrder() returned true.
     */
    function _popBuyOrder() private returns (uint256 idx, BuyOrder memory order) {
        while (buyHead < buyTail) {
            if (gasleft() < GAS_BUFFER) revert InsufficientGasForQueueScan();

            idx = buyHead++;
            order = buyQueue[idx];
            if (order.amountLocked > 0) {
                delete buyQueue[idx];
                return (idx, order);
            }
        }
        revert NoBuyOrder();
    }

    /**
     * @dev Advance sellHead past stale entries (cancelled or NFT no longer
     *      owned by the original seller).
     *      Same gasleft() guard as _hasPendingBuyOrder.
     */
    function _hasPendingSellOrder() private returns (bool found, bool gasLimitReached) {
        while (sellHead < sellTail) {
            SellOrder storage so = sellQueue[sellHead];
            if (so.seller != address(0) && _ownerOf(so.tokenId) == so.seller) {
                return (true, false);
            }

            // Stale entry — check gas before advancing
            if (gasleft() < GAS_BUFFER) {
                emit QueueGasLimitReached(false);
                return (false, true);
            }

            delete _sellIndex[so.tokenId];
            delete sellQueue[sellHead];
            sellHead++;
        }
        return (false, false);
    }

    /**
     * @dev Pop the first valid sell order from the queue.
     *      Reverts with NoSellOrder if none found or gas runs low.
     */
    function _popSellOrder() private returns (uint256 idx, SellOrder memory order) {
        while (sellHead < sellTail) {
            if (gasleft() < GAS_BUFFER) revert InsufficientGasForQueueScan();

            idx = sellHead++;
            order = sellQueue[idx];
            if (order.seller != address(0) && _ownerOf(order.tokenId) == order.seller) {
                delete sellQueue[idx];
                return (idx, order);
            }
            // Clean up stale sell entry while we're here
            delete _sellIndex[order.tokenId];
        }
        revert NoSellOrder();
    }

    // ──────────────────────────────────────────────
    //  WITHDRAWALS (Pull pattern, CEI)
    // ──────────────────────────────────────────────

    function withdrawPrimarySales() external onlyOrganizer onlyAfterEnd nonReentrant {
        uint256 amount = organizerPrimaryBalance;
        if (amount == 0) revert NothingToWithdraw();

        organizerPrimaryBalance = 0; // Effect before interaction (CEI)

        (bool ok,) = organizer.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit OrganizerPrimaryWithdrawal(organizer, amount);
    }

    function withdrawRoyalties() external onlyOrganizer onlyAfterEnd nonReentrant {
        uint256 amount = organizerRoyaltyBalance;
        if (amount == 0) revert NothingToWithdraw();

        organizerRoyaltyBalance = 0;

        (bool ok,) = organizer.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit OrganizerRoyaltyWithdrawal(organizer, amount);
    }

    /**
     * @notice Withdraw both primary-sales income and royalties in one tx.
     *         Saves ~21 000 gas vs two separate calls.
     */
    function withdrawAllOrganizer() external onlyOrganizer onlyAfterEnd nonReentrant {
        uint256 primary = organizerPrimaryBalance;
        uint256 royalty = organizerRoyaltyBalance;
        uint256 amount = primary + royalty;
        if (amount == 0) revert NothingToWithdraw();

        // Effects (CEI)
        organizerPrimaryBalance = 0;
        organizerRoyaltyBalance = 0;

        (bool ok,) = organizer.call{value: amount}("");
        if (!ok) revert TransferFailed();

        if (primary > 0) emit OrganizerPrimaryWithdrawal(organizer, primary);
        if (royalty > 0) emit OrganizerRoyaltyWithdrawal(organizer, royalty);
    }

    function withdrawSellerBalance() external nonReentrant {
        uint256 amount = sellerBalance[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        sellerBalance[msg.sender] = 0;

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit SellerWithdrawal(msg.sender, amount);
    }

    // ──────────────────────────────────────────────
    //  METADATA (on-chain dynamic generation)
    // ──────────────────────────────────────────────

    /**
     * @dev Dynamic Base64-encoded JSON, generated on-chain so that no
     *      per-token IPFS file is needed (REQ-2.5 / NFR-COMP-004).
     *      The image field points to the shared IPFS cover CID.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory json = string(
            abi.encodePacked(
                "{\"name\":\"",
                title,
                " - Ticket #",
                tokenId.toString(),
                "\",\"description\":\"Official TicketPulse NFT Ticket\"",
                ",\"image\":\"ipfs://",
                ipfsCoverImageCid,
                "\",\"external_url\":\"",
                ITicketPulseFactory(factory).baseExternalUrl(),
                address(this).toHexString(),
                "/",
                tokenId.toString(),
                "\",\"attributes\":[{\"trait_type\":\"Type\",\"value\":\"",
                ticketType,
                "\"}]}"
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @dev Contract-level metadata (NFR-COMP-005).
     *      Includes royalty info for OpenSea-compatible marketplaces.
     */
    function contractURI() external view returns (string memory) {
        string memory json = string(
            abi.encodePacked(
                "{\"name\":\"",
                title,
                " Tickets\",\"description\":\"Official NFT tickets\"",
                ",\"image\":\"ipfs://",
                ipfsCoverImageCid,
                "\",\"external_link\":\"",
                ITicketPulseFactory(factory).baseExternalUrl(),
                address(this).toHexString(),
                "\",\"seller_fee_basis_points\":",
                (uint256(royaltyPct) * 100).toString(),
                ",\"fee_recipient\":\"",
                organizer.toHexString(),
                "\"}"
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ──────────────────────────────────────────────
    //  View helpers
    // ──────────────────────────────────────────────

    function isTicketListed(uint256 tokenId) external view returns (bool) {
        return _sellIndex[tokenId] != 0;
    }
}
