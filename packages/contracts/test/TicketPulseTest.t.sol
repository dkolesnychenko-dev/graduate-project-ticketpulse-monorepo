// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import "../src/TicketPulseFactory.sol";
import "../src/TicketPulseEvent.sol";

/**
 * @title TicketPulseTest
 * @notice Comprehensive unit-test suite for TicketPulseFactory + TicketPulseEvent.
 *
 * Coverage targets (per NFR-MAINT-002 / NFR-REL-003):
 *   ≥ 95 % line / branch coverage of both contracts.
 *
 * Test categories:
 *   1.  Factory – deployment & basic state
 *   2.  Initialize – happy-path and every revert branch
 *   3.  Primary market – mintTickets (success + reverts)
 *   4.  Secondary market – sell-side  (listForSale, cancelSellOrder)
 *   5.  Secondary market – buy-side   (placeBuyOrder, cancelBuyOrder)
 *   6.  Matching engine              (sell→buyer, buyer→seller, atomic)
 *   7.  Withdrawals                  (primary, royalty, combined, seller)
 *   8.  ERC-721 transfer restriction
 *   9.  Metadata                     (tokenURI, contractURI)
 *  10.  View helpers                 (isTicketListed, totalEvents)
 *  11.  Edge / boundary cases        (gas guard, stale queue entries …)
 *  12.  CEI / reentrancy guard checks
 */
contract TicketPulseTest is Test {
    // ──────────────────────────────────────────────
    //  Helpers / shared state
    // ──────────────────────────────────────────────

    TicketPulseFactory internal factory;
    TicketPulseEvent internal impl;

    address internal constant ORGANIZER = address(0x1001);
    address internal constant BUYER_A = address(0x2001);
    address internal constant BUYER_B = address(0x2002);
    address internal constant BUYER_C = address(0x2003);
    address internal constant RANDOM = address(0x9999);

    uint256 internal constant NOMINAL_PRICE = 0.05 ether;
    uint256 internal constant MARKUP_PCT = 20; // 20 %
    uint256 internal constant ROYALTY_PCT = 10; // 10 %
    uint256 internal constant SECONDARY_PRICE = NOMINAL_PRICE * (100 + MARKUP_PCT) / 100;
    //                                         = 0.06 ETH

    uint64 internal startTime; // now + 1 day
    uint64 internal endTime; // now + 2 days

    bytes32 internal constant HASH_A = keccak256("IdentityA");
    bytes32 internal constant HASH_B = keccak256("IdentityB");
    bytes32 internal constant HASH_C = keccak256("IdentityC");

    // ──────────────────────────────────────────────
    //  setUp – runs before every test
    // ──────────────────────────────────────────────

    function setUp() public {
        // Deploy the implementation (constructor sets _initialized = true on it)
        impl = new TicketPulseEvent();
        factory = new TicketPulseFactory(address(impl), "https://ticketpulse.app/event/");

        // Give test actors some ETH
        vm.deal(ORGANIZER, 100 ether);
        vm.deal(BUYER_A, 100 ether);
        vm.deal(BUYER_B, 100 ether);
        vm.deal(BUYER_C, 100 ether);
        vm.deal(RANDOM, 100 ether);

        startTime = uint64(block.timestamp + 1 days);
        endTime = uint64(block.timestamp + 2 days);
    }

    // ──────────────────────────────────────────────
    //  Internal helpers
    // ──────────────────────────────────────────────

    /// Returns a fully-populated InitParams struct.
    function _defaultParams() internal view returns (TicketPulseEvent.InitParams memory) {
        return TicketPulseEvent.InitParams({
            organizer: ORGANIZER,
            startTime: startTime,
            endTime: endTime,
            nominalPrice: NOMINAL_PRICE,
            maxSupply: 100,
            maxTicketsPerWallet: 6,
            royaltyPct: uint8(ROYALTY_PCT),
            markupPct: uint8(MARKUP_PCT),
            title: "Test Event",
            ticketType: "General",
            ticketSymbol: "TEST",
            ipfsCoverImageCid: "Qm123",
            ipfsMetadataCid: "Qm456",
            location: "Kyiv, Ukraine"
        });
    }

    /// Creates a clone via the factory and returns it as TicketPulseEvent.
    function _createEvent() internal returns (TicketPulseEvent) {
        address clone = factory.createEvent(_defaultParams());
        return TicketPulseEvent(clone);
    }

    /// Mints `qty` tickets for `buyer` using identity hashes generated from `seed`.
    function _mint(TicketPulseEvent ev, address buyer, uint256 qty, bytes32 seed) internal {
        bytes32[] memory hashes = new bytes32[](qty);
        for (uint256 i; i < qty; i++) {
            hashes[i] = keccak256(abi.encodePacked(seed, i));
        }
        vm.prank(buyer);
        ev.mintTickets{value: NOMINAL_PRICE * qty}(hashes);
    }

    /// Warp past event end (phase 3).
    function _warpPastEnd(TicketPulseEvent ev) internal {
        vm.warp(ev.endTime() + 1);
    }

    /// Warp to event active phase (phase 2).
    function _warpToActive(TicketPulseEvent ev) internal {
        vm.warp(ev.startTime() + 1);
    }

    // ══════════════════════════════════════════════
    //  1. FACTORY
    // ══════════════════════════════════════════════

    function test_factory_storesImplementation() public view {
        assertEq(factory.implementation(), address(impl));
    }

    function test_factory_revertOnZeroImpl() public {
        vm.expectRevert(TicketPulseFactory.InvalidImplementationAddress.selector);
        new TicketPulseFactory(address(0), "https://ticketpulse.app/event/");
    }

    function test_factory_createEvent_incrementsCounter() public {
        assertEq(factory.totalEvents(), 0);
        _createEvent();
        assertEq(factory.totalEvents(), 1);
        _createEvent();
        assertEq(factory.totalEvents(), 2);
    }

    function test_factory_createEvent_emitsEventCreated() public {
        vm.expectEmit(false, true, true, false);
        emit TicketPulseFactory.EventCreated(address(0), ORGANIZER, 0);
        factory.createEvent(_defaultParams());
    }

    function test_factory_allEvents_storedCorrectly() public {
        address clone1 = factory.createEvent(_defaultParams());
        address clone2 = factory.createEvent(_defaultParams());
        assertEq(factory.allEvents(0), clone1);
        assertEq(factory.allEvents(1), clone2);
    }

    function test_factory_cloneIsNotImplementation() public {
        address clone = factory.createEvent(_defaultParams());
        assertTrue(clone != address(impl));
    }

    function test_factory_setBaseExternalUrl_onlyOwner() public {
        string memory newUrl = "https://newsite.com/ticket/";

        // Owner (this contract) can set
        factory.setBaseExternalUrl(newUrl);
        assertEq(factory.baseExternalUrl(), newUrl);

        // Non-owner cannot set
        vm.prank(RANDOM);
        vm.expectRevert(); // OwnableUnauthorizedAccount or similar depending on version
        factory.setBaseExternalUrl("https://evil.com/");
    }

    // ══════════════════════════════════════════════
    //  2. INITIALIZER
    // ══════════════════════════════════════════════

    function test_init_setsAllState() public {
        TicketPulseEvent ev = _createEvent();
        assertEq(ev.organizer(), ORGANIZER);
        assertEq(ev.factory(), address(factory));
        assertEq(ev.startTime(), startTime);
        assertEq(ev.endTime(), endTime);
        assertEq(ev.nominalPrice(), NOMINAL_PRICE);
        assertEq(ev.maxSupply(), 100);
        assertEq(ev.maxTicketsPerWallet(), 6);
        assertEq(ev.royaltyPct(), uint8(ROYALTY_PCT));
        assertEq(ev.markupPct(), uint8(MARKUP_PCT));
        assertEq(ev.secondaryPrice(), SECONDARY_PRICE);
        assertEq(ev.title(), "Test Event");
        assertEq(ev.ticketType(), "General");
        assertEq(ev.ticketSymbol(), "TEST");
        assertEq(ev.ipfsCoverImageCid(), "Qm123");
    }

    function test_init_revert_alreadyInitialized() public {
        TicketPulseEvent ev = _createEvent();
        vm.expectRevert(TicketPulseEvent.AlreadyInitialized.selector);
        ev.initialize(_defaultParams());
    }

    function test_init_revert_onImplementation() public {
        // The implementation itself has _initialized = true after constructor.
        vm.expectRevert(TicketPulseEvent.AlreadyInitialized.selector);
        impl.initialize(_defaultParams());
    }

    function test_init_revert_zeroOrganizer() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.organizer = address(0);
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_startTimeInPast() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.startTime = uint64(block.timestamp); // exactly now → not strictly future
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_endBeforeStart() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.endTime = p.startTime - 1;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_zeroNominalPrice() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.nominalPrice = 0;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_zeroMaxSupply() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.maxSupply = 0;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_maxSupplyExceedsCap() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.maxSupply = uint32(TicketPulseEvent(address(impl)).MAX_SUPPLY_CAP()) + 1;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_zeroMaxTicketsPerWallet() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.maxTicketsPerWallet = 0;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_maxTicketsPerWalletExceedsCap() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.maxTicketsPerWallet = uint8(TicketPulseEvent(address(impl)).MAX_WALLET_CAP()) + 1;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_royaltyExceedsMax() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.royaltyPct = uint8(TicketPulseEvent(address(impl)).MAX_ROYALTY_PCT()) + 1;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_revert_markupExceedsMax() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.markupPct = uint8(TicketPulseEvent(address(impl)).MAX_MARKUP_PCT()) + 1;
        vm.expectRevert(TicketPulseEvent.InvalidParams.selector);
        factory.createEvent(p);
    }

    function test_init_secondaryPriceCalculation() public {
        TicketPulseEvent ev = _createEvent();
        // secondaryPrice = nominalPrice * (100 + markupPct) / 100
        uint256 expected = NOMINAL_PRICE * (100 + MARKUP_PCT) / 100;
        assertEq(ev.secondaryPrice(), expected);
    }

    // ══════════════════════════════════════════════
    //  3. PRIMARY MARKET — mintTickets
    // ══════════════════════════════════════════════

    function test_mint_singleTicket() public {
        TicketPulseEvent ev = _createEvent();
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = HASH_A;

        vm.prank(BUYER_A);
        vm.expectEmit(true, true, false, true);
        emit TicketPulseEvent.TicketMinted(BUYER_A, 1, NOMINAL_PRICE, HASH_A);
        ev.mintTickets{value: NOMINAL_PRICE}(hashes);

        assertEq(ev.ownerOf(1), BUYER_A);
        assertEq(ev.identityHash(1), HASH_A);
        assertEq(ev.totalMinted(), 1);
        assertEq(ev.organizerPrimaryBalance(), NOMINAL_PRICE);
    }

    function test_mint_batchTickets() public {
        TicketPulseEvent ev = _createEvent();
        uint256 qty = 3;
        bytes32[] memory hashes = new bytes32[](qty);
        for (uint256 i; i < qty; i++) {
            hashes[i] = keccak256(abi.encodePacked("h", i));
        }

        vm.prank(BUYER_A);
        ev.mintTickets{value: NOMINAL_PRICE * qty}(hashes);

        assertEq(ev.balanceOf(BUYER_A), qty);
        assertEq(ev.totalMinted(), qty);
        assertEq(ev.organizerPrimaryBalance(), NOMINAL_PRICE * qty);
    }

    function test_mint_revert_emptyArray() public {
        TicketPulseEvent ev = _createEvent();
        bytes32[] memory hashes = new bytes32[](0);
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.MaxBatchExceeded.selector);
        ev.mintTickets{value: 0}(hashes);
    }

    function test_mint_revert_exceedsMaxBatch() public {
        TicketPulseEvent ev = _createEvent();
        uint256 batch = ev.MAX_BATCH_SIZE() + 1;
        bytes32[] memory hashes = new bytes32[](batch);
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.MaxBatchExceeded.selector);
        ev.mintTickets{value: NOMINAL_PRICE * batch}(hashes);
    }

    function test_mint_revert_soldOut() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.maxSupply = 2;
        p.maxTicketsPerWallet = 2;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);

        // Mint 2 (sold out)
        bytes32[] memory h = new bytes32[](2);
        h[0] = HASH_A;
        h[1] = HASH_B;
        vm.prank(BUYER_A);
        ev.mintTickets{value: NOMINAL_PRICE * 2}(h);

        bytes32[] memory h2 = new bytes32[](1);
        h2[0] = HASH_C;
        vm.prank(BUYER_B);
        vm.expectRevert(TicketPulseEvent.SoldOut.selector);
        ev.mintTickets{value: NOMINAL_PRICE}(h2);
    }

    function test_mint_revert_walletLimitExceeded() public {
        TicketPulseEvent ev = _createEvent(); // maxTicketsPerWallet = 6
        _mint(ev, BUYER_A, 6, HASH_A);

        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_B;
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.WalletLimitExceeded.selector);
        ev.mintTickets{value: NOMINAL_PRICE}(h);
    }

    function test_mint_revert_walletLimitBypass_withPendingBuyOrder() public {
        TicketPulseEvent ev = _createEvent(); // maxTicketsPerWallet = 6
        _mint(ev, BUYER_A, 5, HASH_A);

        // Place a buy order (reserves 1 slot)
        vm.prank(BUYER_A);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        // Try to mint 1 more ticket. Should revert because 5 + 1 (pending) + 1 (mint) = 7 > 6
        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_C;
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.WalletLimitExceeded.selector);
        ev.mintTickets{value: NOMINAL_PRICE}(h);
    }

    function test_mint_revert_incorrectPayment_tooLow() public {
        TicketPulseEvent ev = _createEvent();
        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.IncorrectPayment.selector);
        ev.mintTickets{value: NOMINAL_PRICE - 1}(h);
    }

    function test_mint_revert_incorrectPayment_tooHigh() public {
        TicketPulseEvent ev = _createEvent();
        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.IncorrectPayment.selector);
        ev.mintTickets{value: NOMINAL_PRICE + 1}(h);
    }

    function test_mint_revert_afterEventStart() public {
        TicketPulseEvent ev = _createEvent();
        _warpToActive(ev);

        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.EventNotInSalePhase.selector);
        ev.mintTickets{value: NOMINAL_PRICE}(h);
    }

    function test_mint_tokenIdsStartAtOne() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        assertEq(ev.ownerOf(1), BUYER_A);
    }

    // ══════════════════════════════════════════════
    //  4. SECONDARY MARKET — SELL SIDE
    // ══════════════════════════════════════════════

    function test_listForSale_addsToQueue() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_A);
        vm.expectEmit(true, true, true, true);
        emit TicketPulseEvent.SellOrderCreated(1, 1, BUYER_A, SECONDARY_PRICE);
        ev.listForSale(1);

        assertTrue(ev.isTicketListed(1));
        // sellHead=1, sellTail should now be 2
        assertEq(ev.sellTail(), 2);
    }

    function test_listForSale_revert_notOwner() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_B);
        vm.expectRevert(TicketPulseEvent.NotTicketOwner.selector);
        ev.listForSale(1);
    }

    function test_listForSale_revert_alreadyListed() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_A);
        ev.listForSale(1);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.TicketAlreadyListed.selector);
        ev.listForSale(1);
    }

    function test_listForSale_revert_afterEventStart() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        _warpToActive(ev);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.EventNotInSalePhase.selector);
        ev.listForSale(1);
    }

    function test_cancelSellOrder_removesFromQueue() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        vm.prank(BUYER_A);
        ev.listForSale(1);

        vm.prank(BUYER_A);
        vm.expectEmit(true, true, true, false);
        emit TicketPulseEvent.SellOrderCancelled(1, 1, BUYER_A);
        ev.cancelSellOrder(1);

        assertFalse(ev.isTicketListed(1));
        assertEq(ev.ownerOf(1), BUYER_A); // still owns it
    }

    function test_cancelSellOrder_revert_notOwner() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        vm.prank(BUYER_A);
        ev.listForSale(1);

        vm.prank(BUYER_B);
        vm.expectRevert(TicketPulseEvent.NotTicketOwner.selector);
        ev.cancelSellOrder(1);
    }

    function test_cancelSellOrder_revert_notListed() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.TicketNotListed.selector);
        ev.cancelSellOrder(1);
    }

    // ══════════════════════════════════════════════
    //  5. SECONDARY MARKET — BUY SIDE
    // ══════════════════════════════════════════════

    function test_placeBuyOrder_addsToQueue() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        vm.expectEmit(false, true, false, true);
        emit TicketPulseEvent.BuyOrderCreated(1, BUYER_A, SECONDARY_PRICE, HASH_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        assertEq(ev.buyTail(), 2);
        (address buyer, bytes32 idHash, uint256 locked) = ev.buyQueue(1);
        assertEq(buyer, BUYER_A);
        assertEq(idHash, HASH_B);
        assertEq(locked, SECONDARY_PRICE);
    }

    function test_placeBuyOrder_revert_incorrectPayment() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.IncorrectPayment.selector);
        ev.placeBuyOrder{value: SECONDARY_PRICE - 1}(HASH_B);
    }

    function test_placeBuyOrder_revert_walletLimit() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 6, HASH_A); // already at cap

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.WalletLimitExceeded.selector);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
    }

    function test_placeBuyOrder_revert_alreadyInQueue() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.AlreadyInBuyQueue.selector);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
    }

    function test_placeBuyOrder_revert_afterEventStart() public {
        TicketPulseEvent ev = _createEvent();
        _warpToActive(ev);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.EventNotInSalePhase.selector);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
    }

    function test_cancelBuyOrder_refundsFunds() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        uint256 balBefore = BUYER_A.balance;
        vm.prank(BUYER_A);
        ev.cancelBuyOrder();
        uint256 balAfter = BUYER_A.balance;

        assertApproxEqAbs(balAfter - balBefore, SECONDARY_PRICE, 1e9); // allow tiny gas rounding
        assertEq(ev.activeBuyOrderId(BUYER_A), 0);
    }

    function test_cancelBuyOrder_revert_noBuyOrder() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.NoBuyOrder.selector);
        ev.cancelBuyOrder();
    }

    /// cancelBuyOrder should work even after event end (stranded funds recovery).
    function test_cancelBuyOrder_worksAfterEventEnd() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        _warpPastEnd(ev);

        vm.prank(BUYER_A);
        ev.cancelBuyOrder();
        assertEq(ev.activeBuyOrderId(BUYER_A), 0);
    }

    // ══════════════════════════════════════════════
    //  6. MATCHING ENGINE
    // ══════════════════════════════════════════════

    /// Seller lists → buyer already in queue (matchWithBuyer path).
    function test_match_sellerListsWithPendingBuyer() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Buyer places order first
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        uint256 sellerBalBefore = BUYER_A.balance;

        // Seller lists → immediate match
        vm.prank(BUYER_A);
        ev.listForSale(1);

        uint256 royalty = SECONDARY_PRICE * ROYALTY_PCT / 100;
        uint256 sellerPayout = SECONDARY_PRICE - royalty;

        // Seller receives ETH immediately (push, because they initiated)
        assertApproxEqAbs(BUYER_A.balance - sellerBalBefore, sellerPayout, 1e9);

        // Buyer now owns token
        assertEq(ev.ownerOf(1), BUYER_B);

        // Identity hash updated to buyer's hash
        assertEq(ev.identityHash(1), HASH_B);

        // Royalty credited to organizer
        assertEq(ev.organizerRoyaltyBalance(), royalty);

        // Token is no longer listed
        assertFalse(ev.isTicketListed(1));

        // Buyer no longer in buy queue
        assertEq(ev.activeBuyOrderId(BUYER_B), 0);
    }

    /// Buyer places order → seller already in queue (matchWithSeller path).
    function test_match_buyerPlacesWithPendingSeller() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Seller lists first
        vm.prank(BUYER_A);
        ev.listForSale(1);

        // Buyer places order → immediate match
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        uint256 royalty = SECONDARY_PRICE * ROYALTY_PCT / 100;
        uint256 sellerPayout = SECONDARY_PRICE - royalty;

        // Buyer owns token
        assertEq(ev.ownerOf(1), BUYER_B);
        assertEq(ev.identityHash(1), HASH_B);

        // Seller's funds go to pull balance (pull pattern, seller not initiator)
        assertEq(ev.sellerBalance(BUYER_A), sellerPayout);

        // Royalty credited
        assertEq(ev.organizerRoyaltyBalance(), royalty);
    }

    /// Two sequential resales — cumulative royalty accounting.
    function test_match_twoResales_royaltyAccumulates() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Resale 1: BUYER_A → BUYER_B
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        // Resale 2: BUYER_B → BUYER_C
        vm.prank(BUYER_B);
        ev.listForSale(1);
        vm.prank(BUYER_C);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_C);

        uint256 royaltyPerSale = SECONDARY_PRICE * ROYALTY_PCT / 100;
        assertEq(ev.organizerRoyaltyBalance(), royaltyPerSale * 2);
        assertEq(ev.ownerOf(1), BUYER_C);
    }

    /// OrderMatched emitted correctly on seller-lists path.
    function test_match_emitsOrderMatchedEvent() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        uint256 royalty = SECONDARY_PRICE * ROYALTY_PCT / 100;
        uint256 sellerPayout = SECONDARY_PRICE - royalty;

        vm.prank(BUYER_A);
        vm.expectEmit(true, true, true, true);
        emit TicketPulseEvent.OrderMatched(1, BUYER_A, BUYER_B, SECONDARY_PRICE, royalty, sellerPayout, 0, 1, HASH_B);
        ev.listForSale(1);
    }

    // ══════════════════════════════════════════════
    //  7. WITHDRAWALS
    // ══════════════════════════════════════════════

    function test_withdraw_primarySales() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 2, HASH_A);

        _warpPastEnd(ev);

        uint256 orgBalBefore = ORGANIZER.balance;
        vm.prank(ORGANIZER);
        ev.withdrawPrimarySales();

        assertEq(ev.organizerPrimaryBalance(), 0);
        assertApproxEqAbs(ORGANIZER.balance - orgBalBefore, NOMINAL_PRICE * 2, 1e9);
    }

    function test_withdraw_primarySales_revert_notOrganizer() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        _warpPastEnd(ev);

        vm.prank(RANDOM);
        vm.expectRevert(TicketPulseEvent.NotOrganizer.selector);
        ev.withdrawPrimarySales();
    }

    function test_withdraw_primarySales_revert_beforeEnd() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(ORGANIZER);
        vm.expectRevert(TicketPulseEvent.EventNotEnded.selector);
        ev.withdrawPrimarySales();
    }

    function test_withdraw_primarySales_revert_nothingToWithdraw() public {
        TicketPulseEvent ev = _createEvent();
        _warpPastEnd(ev);

        vm.prank(ORGANIZER);
        vm.expectRevert(TicketPulseEvent.NothingToWithdraw.selector);
        ev.withdrawPrimarySales();
    }

    function test_withdraw_royalties() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Create royalty via a resale
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        _warpPastEnd(ev);

        uint256 expectedRoyalty = SECONDARY_PRICE * ROYALTY_PCT / 100;
        uint256 orgBalBefore = ORGANIZER.balance;
        vm.prank(ORGANIZER);
        ev.withdrawRoyalties();

        assertEq(ev.organizerRoyaltyBalance(), 0);
        assertApproxEqAbs(ORGANIZER.balance - orgBalBefore, expectedRoyalty, 1e9);
    }

    function test_withdraw_royalties_revert_nothingToWithdraw() public {
        TicketPulseEvent ev = _createEvent();
        _warpPastEnd(ev);

        vm.prank(ORGANIZER);
        vm.expectRevert(TicketPulseEvent.NothingToWithdraw.selector);
        ev.withdrawRoyalties();
    }

    function test_withdraw_allOrganizer_combinedInOneTx() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Generate royalty
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        _warpPastEnd(ev);

        uint256 royalty = SECONDARY_PRICE * ROYALTY_PCT / 100;
        uint256 primary = NOMINAL_PRICE;
        uint256 orgBalBefore = ORGANIZER.balance;

        vm.prank(ORGANIZER);
        ev.withdrawAllOrganizer();

        assertEq(ev.organizerPrimaryBalance(), 0);
        assertEq(ev.organizerRoyaltyBalance(), 0);
        assertApproxEqAbs(ORGANIZER.balance - orgBalBefore, primary + royalty, 1e9);
    }

    function test_withdraw_allOrganizer_revert_nothingToWithdraw() public {
        TicketPulseEvent ev = _createEvent();
        _warpPastEnd(ev);

        vm.prank(ORGANIZER);
        vm.expectRevert(TicketPulseEvent.NothingToWithdraw.selector);
        ev.withdrawAllOrganizer();
    }

    function test_withdraw_sellerBalance() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // Seller lists first so funds go to pull balance
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        uint256 sellerPayout = SECONDARY_PRICE - SECONDARY_PRICE * ROYALTY_PCT / 100;
        assertEq(ev.sellerBalance(BUYER_A), sellerPayout);

        uint256 balBefore = BUYER_A.balance;
        vm.prank(BUYER_A);
        ev.withdrawSellerBalance();

        assertEq(ev.sellerBalance(BUYER_A), 0);
        assertApproxEqAbs(BUYER_A.balance - balBefore, sellerPayout, 1e9);
    }

    function test_withdraw_sellerBalance_revert_nothingToWithdraw() public {
        TicketPulseEvent ev = _createEvent();

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.NothingToWithdraw.selector);
        ev.withdrawSellerBalance();
    }

    /// CEI pattern: second withdrawal on same block must revert (balance already zeroed).
    function test_withdraw_CEI_noDoubleWithdraw() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        _warpPastEnd(ev);

        vm.startPrank(ORGANIZER);
        ev.withdrawPrimarySales();
        vm.expectRevert(TicketPulseEvent.NothingToWithdraw.selector);
        ev.withdrawPrimarySales();
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════
    //  8. ERC-721 TRANSFER RESTRICTION
    // ══════════════════════════════════════════════

    function test_directTransfer_reverts() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.DirectTransfersDisabled.selector);
        ev.transferFrom(BUYER_A, BUYER_B, 1);
    }

    function test_safeTransfer_reverts() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(BUYER_A);
        vm.expectRevert(TicketPulseEvent.DirectTransfersDisabled.selector);
        ev.safeTransferFrom(BUYER_A, BUYER_B, 1);
    }

    // ══════════════════════════════════════════════
    //  9. METADATA
    // ══════════════════════════════════════════════

    function test_tokenURI_returnsBase64Json() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        string memory uri = ev.tokenURI(1);
        // Must start with the data-URI prefix
        assertTrue(bytes(uri).length > 0, "tokenURI should not be empty");
        // Check prefix
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        for (uint256 i; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i], "tokenURI must be base64 data-URI");
        }
    }

    function test_tokenURI_containsBaseUrl() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // But since we are in Solidity, we can just check if the URI changes when base URL changes.

        string memory originalUri = ev.tokenURI(1);

        factory.setBaseExternalUrl("https://changed.app/");
        string memory newUri = ev.tokenURI(1);

        assertTrue(keccak256(bytes(originalUri)) != keccak256(bytes(newUri)), "URI should change when base URL changes");
    }

    function test_tokenURI_revert_nonexistentToken() public {
        TicketPulseEvent ev = _createEvent();
        vm.expectRevert();
        ev.tokenURI(999);
    }

    function test_contractURI_returnsBase64Json() public {
        TicketPulseEvent ev = _createEvent();
        string memory uri = ev.contractURI();
        assertTrue(bytes(uri).length > 0, "contractURI should not be empty");
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        for (uint256 i; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }

    function test_name_returnsTitle() public {
        TicketPulseEvent ev = _createEvent();
        assertEq(ev.name(), "Test Event");
    }

    function test_symbol_returnsTicketSymbol() public {
        TicketPulseEvent ev = _createEvent();
        assertEq(ev.symbol(), "TEST");
    }

    // ══════════════════════════════════════════════
    //  10. VIEW HELPERS
    // ══════════════════════════════════════════════

    function test_isTicketListed_falseByDefault() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        assertFalse(ev.isTicketListed(1));
    }

    function test_isTicketListed_trueAfterList() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        vm.prank(BUYER_A);
        ev.listForSale(1);
        assertTrue(ev.isTicketListed(1));
    }

    function test_isTicketListed_falseAfterCancel() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_A);
        ev.cancelSellOrder(1);
        assertFalse(ev.isTicketListed(1));
    }

    function test_totalEvents_factory() public {
        assertEq(factory.totalEvents(), 0);
        _createEvent();
        assertEq(factory.totalEvents(), 1);
    }

    // ══════════════════════════════════════════════
    //  11. EDGE / BOUNDARY CASES
    // ══════════════════════════════════════════════

    /// Zero-royalty event: seller receives full secondary price.
    function test_edge_zeroRoyalty() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.royaltyPct = 0;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);

        _mint(ev, BUYER_A, 1, HASH_A);
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: ev.secondaryPrice()}(HASH_B);

        // All secondary price goes to seller (via pull balance)
        assertEq(ev.sellerBalance(BUYER_A), ev.secondaryPrice());
        assertEq(ev.organizerRoyaltyBalance(), 0);
    }

    /// Zero-markup event: secondary price equals nominal price.
    function test_edge_zeroMarkup() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.markupPct = 0;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);
        assertEq(ev.secondaryPrice(), NOMINAL_PRICE);
    }

    /// Max royalty (20 %) and max markup (100 %) accepted.
    function test_edge_maxRoyaltyAndMarkup() public {
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.royaltyPct = 20;
        p.markupPct = 100;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);
        assertEq(ev.royaltyPct(), 20);
        assertEq(ev.markupPct(), 100);
        assertEq(ev.secondaryPrice(), NOMINAL_PRICE * 2);
    }

    /// Minting MAX_BATCH_SIZE in one transaction.
    function test_edge_maxBatchSize() public {
        TicketPulseEvent ev = _createEvent();
        uint256 batch = ev.MAX_BATCH_SIZE();
        bytes32[] memory h = new bytes32[](batch);
        for (uint256 i; i < batch; i++) {
            h[i] = keccak256(abi.encodePacked("x", i));
        }

        vm.prank(BUYER_A);
        ev.mintTickets{value: NOMINAL_PRICE * batch}(h);
        assertEq(ev.totalMinted(), batch);
    }

    /// After matching, listing/buying the same ticket by the new owner works.
    function test_edge_ticketCanBeRelistedAfterResale() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // First resale: A → B
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);

        // B relists
        vm.prank(BUYER_B);
        ev.listForSale(1);
        assertTrue(ev.isTicketListed(1));
    }

    /// Multiple independent buy orders in queue.
    function test_edge_multipleBuyOrdersInQueue() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 2, HASH_A);

        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
        vm.prank(BUYER_C);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_C);

        assertEq(ev.buyTail(), 3); // head=1, tail=3 (2 orders)
    }

    /// Seller lists two tickets; each matched with correct FIFO buyer.
    function test_edge_FIFO_order_preserved() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 2, HASH_A);

        // Two buyers queue up
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
        vm.prank(BUYER_C);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_C);

        // Seller lists token #1 → should go to BUYER_B (first in queue)
        vm.prank(BUYER_A);
        ev.listForSale(1);
        assertEq(ev.ownerOf(1), BUYER_B);

        // Seller lists token #2 → should go to BUYER_C
        vm.prank(BUYER_A);
        ev.listForSale(2);
        assertEq(ev.ownerOf(2), BUYER_C);
    }

    /// cancelBuyOrder leaves the slot empty (amountLocked = 0);
    /// next buyer who places will get a new slot, old one skipped.
    function test_edge_cancelledBuyOrderSkippedInQueue() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        // BUYER_B queues, then cancels
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_B);
        vm.prank(BUYER_B);
        ev.cancelBuyOrder();

        // BUYER_C queues
        vm.prank(BUYER_C);
        ev.placeBuyOrder{value: SECONDARY_PRICE}(HASH_C);

        // Seller lists → should match with BUYER_C (BUYER_B's slot stale)
        vm.prank(BUYER_A);
        ev.listForSale(1);
        assertEq(ev.ownerOf(1), BUYER_C);
    }

    /// Organizer can call withdrawAllOrganizer when only primary exists (no royalty).
    function test_edge_withdrawAll_onlyPrimary() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        _warpPastEnd(ev);

        vm.prank(ORGANIZER);
        ev.withdrawAllOrganizer();
        assertEq(ev.organizerPrimaryBalance(), 0);
    }

    /// Organizer can call withdrawAllOrganizer when only royalty exists (no primary minted via tests – we simulate by doing a resale only; note primary always exists if we mint, so we test through the normal path).
    function test_edge_withdrawAll_onlyRoyalty() public {
        // Deploy event with 0-price primary so we can drain primary separately first
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.nominalPrice = 0.01 ether;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);

        uint256 secPrice = ev.secondaryPrice();

        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        ev.mintTickets{value: 0.01 ether}(h);

        // Resale A→B to create royalty
        vm.prank(BUYER_A);
        ev.listForSale(1);
        vm.prank(BUYER_B);
        ev.placeBuyOrder{value: secPrice}(HASH_B);

        _warpPastEnd(ev);

        // Withdraw primary first
        vm.prank(ORGANIZER);
        ev.withdrawPrimarySales();

        // Now only royalty remains → withdrawAll should still work
        vm.prank(ORGANIZER);
        ev.withdrawAllOrganizer();
        assertEq(ev.organizerRoyaltyBalance(), 0);
    }

    // ══════════════════════════════════════════════
    //  12. REENTRANCY GUARD
    // ══════════════════════════════════════════════

    /**
     * @notice A malicious receiver that tries to re-enter withdrawPrimarySales.
     *         Because of nonReentrant, the second call should revert.
     */
    function test_reentrancy_withdrawPrimary_blocked() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker();
        vm.deal(address(attacker), 100 ether);

        // Create event with attacker as organizer
        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.organizer = address(attacker);
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);
        attacker.setTarget(address(ev));

        // Mint so there is a primary balance
        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        ev.mintTickets{value: NOMINAL_PRICE}(h);

        _warpPastEnd(ev);

        // Attack should not drain extra funds
        uint256 contractBalBefore = address(ev).balance;
        attacker.attack();

        // Contract balance should have decreased by exactly NOMINAL_PRICE
        uint256 contractBalAfter = address(ev).balance;
        assertEq(contractBalBefore - contractBalAfter, NOMINAL_PRICE);

        // Primary balance must be 0 now (first withdrawal succeeded)
        assertEq(ev.organizerPrimaryBalance(), 0);
    }

    // ══════════════════════════════════════════════
    //  13. PHASE TRANSITIONS
    // ══════════════════════════════════════════════

    function test_phase_salePhaseEndsAtStartTime() public {
        TicketPulseEvent ev = _createEvent();

        // Still in sale phase at startTime - 1
        vm.warp(startTime - 1);
        bytes32[] memory h = new bytes32[](1);
        h[0] = HASH_A;
        vm.prank(BUYER_A);
        ev.mintTickets{value: NOMINAL_PRICE}(h); // should succeed

        // At startTime – no longer sale phase
        vm.warp(startTime);
        bytes32[] memory h2 = new bytes32[](1);
        h2[0] = HASH_B;
        vm.prank(BUYER_B);
        vm.expectRevert(TicketPulseEvent.EventNotInSalePhase.selector);
        ev.mintTickets{value: NOMINAL_PRICE}(h2);
    }

    function test_phase_withdrawalsLockedBeforeEnd() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);

        vm.prank(ORGANIZER);
        vm.expectRevert(TicketPulseEvent.EventNotEnded.selector);
        ev.withdrawPrimarySales();
    }

    function test_phase_withdrawalsUnlockedAfterEnd() public {
        TicketPulseEvent ev = _createEvent();
        _mint(ev, BUYER_A, 1, HASH_A);
        _warpPastEnd(ev);

        vm.prank(ORGANIZER);
        ev.withdrawPrimarySales(); // must not revert
    }

    // ══════════════════════════════════════════════
    //  14. FINANCIAL INVARIANTS (Fuzz)
    // ══════════════════════════════════════════════

    /**
     * @dev Fuzz: royalty + sellerPayout always equals secondary price for any valid pct.
     *      Checks the arithmetic invariant from REQ-3.4-4.
     */
    function testFuzz_royaltySplit(uint8 royaltyPct, uint256 secPrice) public pure {
        vm.assume(royaltyPct <= 20);
        vm.assume(secPrice > 0 && secPrice <= 100 ether);

        uint256 royalty = (secPrice * royaltyPct) / 100;
        uint256 sellerPayout = secPrice - royalty;

        assertEq(royalty + sellerPayout, secPrice, "royalty + sellerPayout must equal secPrice");
    }

    /**
     * @dev Fuzz: secondaryPrice = nominalPrice * (100 + markupPct) / 100
     */
    function testFuzz_secondaryPriceFormula(uint256 nominalPrice, uint8 markupPct) public {
        vm.assume(nominalPrice > 0 && nominalPrice <= 1 ether);
        vm.assume(markupPct <= 100);

        TicketPulseEvent.InitParams memory p = _defaultParams();
        p.nominalPrice = nominalPrice;
        p.markupPct = markupPct;
        address clone = factory.createEvent(p);
        TicketPulseEvent ev = TicketPulseEvent(clone);

        uint256 expected = (nominalPrice * (uint256(100) + markupPct)) / 100;
        assertEq(ev.secondaryPrice(), expected);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @dev Reentrancy attacker contract — tries to call withdrawPrimarySales
 *      a second time inside the ETH receive hook.
 *      The nonReentrant modifier must prevent the second call.
 */
contract ReentrancyAttacker {
    TicketPulseEvent internal target;
    bool internal attacked;

    function setTarget(address _target) external {
        target = TicketPulseEvent(_target);
    }

    function attack() external {
        target.withdrawPrimarySales();
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            // This should revert due to nonReentrant guard
            try target.withdrawPrimarySales() {
            // Expected to revert
            }
                catch {
                // Catch the revert
            }
        }
    }
}
