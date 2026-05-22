/**
 * Static, hard-coded fixtures used by the UI.
 *
 * Design reference: docs/frontend-design.md §6.4
 *
 * SAMPLE_TXS feeds the dropdown in TxHashInput. Each entry's `txHash`
 * is sent verbatim to `GET /api/trace/:txHash` and `GET /api/gas-state/:txHash`.
 *
 * Demo modes:
 *  - When the backend runs with USE_MOCK=true (default): every hash returns
 *    the SAME canonical mock JSON with the hash field substituted in.
 *    Picking any sample demonstrates the UI mechanics; data is identical.
 *  - When the backend runs with USE_MOCK=false: each hash is actually traced
 *    against Alchemy. Only REAL mainnet transactions return 200 — fake hashes
 *    return 404 "Transaction not found on chain".
 *
 * IMPORTANT: every entry below MUST be a real mainnet transaction. To extend
 * this list, copy a tx hash from Etherscan (https://etherscan.io/) — any
 * recent block has hundreds to choose from. Avoid making up hex; live mode
 * will 404 on it.
 *
 * SAMPLE_CONTRACTS feeds the contract-address picker on the Security tab.
 * The four addresses below are the EXACT addresses the unified backend
 * (`backend/app/main.py`) recognises in its ADDRESS_TO_CONTRACT map.
 *  - USE_MOCK=true:  all four return the VulnerableVault mock report.
 *  - USE_MOCK=false: each routes to its corresponding .sol file in
 *    `test_contracts/` and produces a real Slither scan. Requires solc
 *    versions installed via `uv run solc-select install 0.8.20` (etc.).
 */

export interface SampleTx {
  label: string;
  txHash: string;
  description: string;
}

/**
 * Curated demo transactions. Only the first is verified real (Uniswap V2
 * router swap from block 19,840,211 on Ethereum mainnet). Add more by
 * pasting any real mainnet hash from Etherscan into this array.
 *
 * In USE_MOCK=true on the backend, ANY hash works because the backend
 * ignores it. In USE_MOCK=false, ONLY real hashes resolve.
 */
export const SAMPLE_TXS: SampleTx[] = [
  {
    label: "Uniswap V2 Swap (mainnet, verified)",
    txHash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026",
    description: "ETH -> USDC swap with nested DELEGATECALL (block 19840211)",
  },
];

/**
 * Demo contracts - addresses MUST match backend/app/main.py ADDRESS_TO_CONTRACT.
 * The backend uses these addresses to route to the corresponding .sol file
 * under `test_contracts/` and runs Slither on it.
 *
 * Live mode requires solc versions installed:
 *   uv run solc-select install 0.8.20
 *   uv run solc-select install 0.7.6
 */
export const SAMPLE_CONTRACTS: { label: string; address: string }[] = [
  {
    label: "VulnerableVault - Reentrancy demo",
    address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  },
  {
    label: "AccessControlBug - onlyOwner missing",
    address: "0x1111111111111111111111111111111111111111",
  },
  {
    label: "UncheckedCall - low-level call result ignored",
    address: "0x2222222222222222222222222222222222222222",
  },
  {
    label: "OverflowToken - integer overflow",
    address: "0x3333333333333333333333333333333333333333",
  },
];
