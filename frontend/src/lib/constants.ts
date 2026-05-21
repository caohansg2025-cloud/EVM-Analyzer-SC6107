/**
 * Static, hard-coded fixtures used by the UI.
 *
 * Design reference: docs/frontend-design.md §6.4
 *
 * SAMPLE_TXS feeds the dropdown in TxHashInput (Commit 14). Currently has
 * only one entry — matching the single tx hash that appears in our locked
 * mocks. On Day 4 we coordinate with the Backend Integration Engineer to
 * extend this list with 4 more real testnet hashes that the backend can
 * actually trace.
 *
 * SAMPLE_CONTRACTS feeds the contract-address picker on the Security tab.
 * Its single entry matches the contract address in security_response.json.
 */

export interface SampleTx {
  label: string;
  txHash: string;
  description: string;
}

/** Pinned demo transactions — kept in sync with src/mocks/trace_response.json. */
export const SAMPLE_TXS: SampleTx[] = [
  {
    label: "Uniswap V2 Swap",
    txHash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026",
    description: "ETH → USDC swap with nested DELEGATECALL",
  },
];

/** Pinned demo contracts — kept in sync with src/mocks/security_response.json. */
export const SAMPLE_CONTRACTS: { label: string; address: string }[] = [
  {
    label: "VulnerableVault (Reentrancy demo)",
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  },
];
