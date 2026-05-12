// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TicketPulseEvent.sol";
import "../src/TicketPulseFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        TicketPulseEvent implementation = new TicketPulseEvent();

        string memory baseUrl = vm.envOr("BASE_EXTERNAL_URL", string("https://ticketpulse.app/event/"));
        TicketPulseFactory factory = new TicketPulseFactory(address(implementation), baseUrl);

        vm.stopBroadcast();

        console.log("Implementation deployed at:", address(implementation));
        console.log("Factory deployed at:", address(factory));
    }
}
