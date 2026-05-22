/**
 * Static, hard-coded fixtures used by the UI.
 *
 * Design reference: docs/frontend-design.md §6.4
 *
 * SAMPLE_TXS feeds the dropdown in TxHashInput. Each entry's `txHash`
 * is sent verbatim to `GET /api/trace/:txHash` and `GET /api/gas-state/:txHash`.
 *
 * SAMPLE_CONTRACTS feeds the contract-address picker on the Security tab.
 * Addresses are aligned with backend/app/main.py ADDRESS_TO_CONTRACT (the
 * live-Slither routing). In backend mock mode the security endpoint serves
 * the same VulnerableVault payload for all four, so the dropdown variety
 * comes from a frontend-side per-address override in src/lib/api.ts.
 * See docs/security-mock-architecture.md for the rationale.
 */

export interface SampleTx {
  label: string;
  txHash: string;
  description: string;
}

/** Pinned demo transactions — kept in sync with mock_data/trace_response.json. */
export const SAMPLE_TXS: SampleTx[] = [
  {
    label: "Uniswap V2 Swap",
    txHash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026",
    description: "ETH → USDC swap with nested DELEGATECALL",
  },
];

/**
 * Demo contracts — addresses MUST match backend/app/main.py ADDRESS_TO_CONTRACT.
 * Each one has its own frontend mock in src/mocks/ so the dropdown shows
 * DISTINCT findings per pick even though the backend's mock endpoint returns
 * the same VulnerableVault payload regardless of address.
 */
export const SAMPLE_CONTRACTS: { label: string; address: string }[] = [
  {
    label: "VulnerableVault — Reentrancy demo",
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  },
  {
    label: "AccessControlBug — onlyOwner missing",
    address: "0x1111111111111111111111111111111111111111",
  },
  {
    label: "UncheckedCall — low-level call result ignored",
    address: "0x2222222222222222222222222222222222222222",
  },
  {
    label: "OverflowToken — integer overflow",
    address: "0x3333333333333333333333333333333333333333",
  },
];
