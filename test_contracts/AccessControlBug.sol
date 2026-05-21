// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Fixture: missing/incorrect access control on privileged functions.
// Intentionally vulnerable — used as a Slither test fixture for the
// EVM Transaction Debugger & Analyzer (SC6107) security-scan module.
// Expected Slither detectors:
//   - tx-origin             (Medium) on transferOwnership
//   - suicidal              (High)   on kill
//   - arbitrary-send-eth    (High)   on emergencyDrain

contract AccessControlBug {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // VULNERABILITY 1: uses tx.origin for authorization.
    // A phishing contract called by the real owner would pass this check.
    function transferOwnership(address newOwner) external {
        require(tx.origin == owner, "not owner");
        owner = newOwner;
    }

    // VULNERABILITY 2: no access control on selfdestruct.
    // Anyone can permanently destroy the contract and steal its balance.
    function kill() external {
        selfdestruct(payable(msg.sender));
    }

    // VULNERABILITY 3: unrestricted withdrawal of the contract balance.
    function emergencyDrain() external {
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {}
}
