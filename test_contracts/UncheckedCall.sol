// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Fixture: low-level call / send whose return value is silently discarded.
// Intentionally vulnerable — used as a Slither test fixture for the
// EVM Transaction Debugger & Analyzer (SC6107) security-scan module.
// Expected Slither detectors:
//   - unchecked-lowlevel (Medium) on withdraw
//   - unchecked-send     (Medium) on tip

contract UncheckedCall {
    mapping(address => uint256) public credits;

    function deposit() external payable {
        credits[msg.sender] += msg.value;
    }

    // VULNERABILITY: low-level call return value is ignored.
    // If the recipient reverts, the user's credit is already debited and lost.
    function withdraw(address payable recipient, uint256 amount) external {
        require(credits[msg.sender] >= amount, "insufficient");
        credits[msg.sender] -= amount;
        recipient.call{value: amount}("");
    }

    // VULNERABILITY: send() returns false on failure instead of reverting.
    // Ignoring the boolean silently swallows failed transfers.
    function tip(address payable recipient, uint256 amount) external {
        require(credits[msg.sender] >= amount, "insufficient");
        credits[msg.sender] -= amount;
        recipient.send(amount);
    }
}
