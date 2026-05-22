// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

// Fixture: integer overflow / underflow on a pre-0.8 compiler.
// Compiler note: this contract MUST be compiled with solc 0.7.x. Solidity
// 0.8+ inserts implicit overflow checks, which would defeat the fixture.
// Configure with:   solc-select install 0.7.6 && solc-select use 0.7.6
//
// References: SWC-101 (https://swcregistry.io/docs/SWC-101) and the
// BeautyChain (BEC) batchTransfer incident (CVE-2018-10299).
// Intentionally vulnerable — used as a Slither test fixture for the
// EVM Transaction Debugger & Analyzer (SC6107) security-scan module.
//
// Note: Slither does not include a built-in arithmetic-overflow detector
// (it relies on the compiler). Expected signals on this file are
// tautological-compare / tautology on the `>= 0` check and possibly
// divide-before-multiply patterns. Document this limitation in
// docs/security-analysis.md.

contract OverflowToken {
    string public name = "Vulnerable Token";
    string public symbol = "VULN";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
    }

    // VULNERABILITY: `balance - amount >= 0` is always true for uint256.
    // Combined with unchecked subtraction (pre-0.8), the sender can
    // underflow their balance to 2**256 - 1.
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] - amount >= 0, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    // VULNERABILITY: `recipients.length * amount` can overflow to 0,
    // bypassing the balance check while still crediting every recipient.
    // This is the exact pattern from the BEC exploit.
    function batchTransfer(address[] calldata recipients, uint256 amount)
        external
        returns (bool)
    {
        uint256 total = recipients.length * amount;
        require(balanceOf[msg.sender] >= total, "insufficient");
        balanceOf[msg.sender] -= total;
        for (uint256 i = 0; i < recipients.length; i++) {
            balanceOf[recipients[i]] += amount;
        }
        return true;
    }
}
