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
 *
 * Phase 4 adaptation:
 *   - The Position 3 CLI scans local file paths, not on-chain addresses.
 *     The frontend Security tab still wants an "id-shaped" value for the
 *     SWR cache key, so we use the test-contracts' file basenames hex-encoded
 *     into a placeholder address. When the live backend wraps the CLI behind
 *     an HTTP endpoint, the addresses should be replaced with real ones (or
 *     the endpoint can accept the basename / contract name directly).
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

/**
 * Pinned demo contracts. The first entry matches our locked mock JSON.
 *
 * The other four entries point at the actual fixture files in
 * `test_contracts/`. Until the backend exposes them through an HTTP
 * endpoint with real addresses, picking these from the dropdown will
 * return the same mock JSON via `src/lib/api.ts` (the mock fetcher
 * ignores the address). Once a real backend lands, swap the placeholder
 * addresses for the real on-chain ids or move to a name-based picker.
 */
export const SAMPLE_CONTRACTS: { label: string; address: string }[] = [
  {
    label: "VulnerableVault (Reentrancy demo) — locked mock",
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  },
  {
    label: "AccessControlBug.sol — Slither fixture",
    address: "0x0000000000000000000000000000000000000A11",
  },
  {
    label: "OverflowToken.sol — Slither fixture",
    address: "0x0000000000000000000000000000000000000B22",
  },
  {
    label: "UncheckedCall.sol — Slither fixture",
    address: "0x0000000000000000000000000000000000000C33",
  },
  {
    label: "VulnerableVault.sol — Slither fixture",
    address: "0x0000000000000000000000000000000000000D44",
  },
];
