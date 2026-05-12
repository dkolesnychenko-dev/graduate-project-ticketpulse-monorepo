// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TicketPulseEvent.sol";

/**
 * @title TicketPulseFactory
 * @notice Deploys EIP-1167 minimal-proxy clones of TicketPulseEvent for each
 *         new event (REQ-3.2-4 / NFR-SCAL-002).
 *
 *         The factory is the entry-point indexed by The Graph's
 *         EventCreated log to discover all event contracts.
 */
contract TicketPulseFactory is Ownable {
    using Clones for address;

    error InvalidImplementationAddress();
    address public immutable implementation;

    /// @notice Global base URL for ticket external links.
    string public baseExternalUrl;

    /// @notice All created event contracts (for enumeration by The Graph).
    address[] public allEvents;

    event EventCreated(address indexed eventContract, address indexed organizer, uint256 indexed eventIndex);
    event BaseExternalUrlUpdated(string newUrl);

    constructor(address implementation_, string memory baseExternalUrl_) Ownable(msg.sender) {
        if (implementation_ == address(0)) revert InvalidImplementationAddress();
        implementation = implementation_;
        baseExternalUrl = baseExternalUrl_;
    }

    /**
     * @notice Update the global base external URL.
     * @param  newUrl   The new base URL (e.g. "https://ticketpulse.app/event/").
     */
    function setBaseExternalUrl(string calldata newUrl) external onlyOwner {
        baseExternalUrl = newUrl;
        emit BaseExternalUrlUpdated(newUrl);
    }

    /**
     * @notice Create a new event contract.
     * @param  params   All event & ticket parameters, including off-chain
     *                  fields `location` and `ipfsMetadataCid` that are
     *                  forwarded to TicketPulseEvent.initialize() and
     *                  emitted in its EventInitialized log (not stored
     *                  in contract state).
     * @return clone    Address of the newly deployed event contract.
     */
    function createEvent(TicketPulseEvent.InitParams calldata params) external returns (address clone) {
        clone = implementation.clone();

        TicketPulseEvent(clone).initialize(params);

        allEvents.push(clone);

        emit EventCreated(clone, params.organizer, allEvents.length - 1);
    }

    function totalEvents() external view returns (uint256) {
        return allEvents.length;
    }
}
