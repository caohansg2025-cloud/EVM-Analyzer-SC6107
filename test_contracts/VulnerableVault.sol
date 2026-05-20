// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Fixture: classic reentrancy (Checks-Effects-Interactions violation).
// Adapted from: https://github.com/crytic/not-so-smart-contracts/tree/master/reentrancy
// Intentionally vulnerable — used as a Slither test fixture for the
// EVM Transaction Debugger & Analyzer (SC6107) security-scan module.
// Expected Slither detectors: reentrancy-eth (High).

contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient balance");

        // VULNERABILITY: external call happens before the state update.
        // A malicious receiver can re-enter withdraw() and drain the vault.
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        balances[msg.sender] -= amount;
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}
