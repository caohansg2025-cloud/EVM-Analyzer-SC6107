/**
 * Type definitions for the Gas Profiling + State Diff module.
 *
 * Source schema: ../../../../mock_data/gas_state_response.json
 * Owner of source schema: Position 2 — Gas & State Engineer
 * Design reference: docs/frontend-design.md §5.2
 *
 * NOTE: This single response combines TWO core features (Gas Profiling AND
 * State Diff Visualization) — they share one endpoint, not two separate calls.
 */

/** One row in the gas-breakdown table — corresponds to one logical function/operation. */
export interface GasBreakdownEntry {
  function: string;     // human-readable name, e.g. "UniswapV3Pool.swap"
  gas: number;          // gas units consumed
  percentage: number;   // 0-100, share of the transaction's total gas
}

/** Gas-related half of the response. */
export interface GasProfiling {
  totalGasUsed: number;
  breakdown: GasBreakdownEntry[];
  optimizationSuggestions: string;  // free-text, may contain non-ASCII / Chinese
}

/** ETH or native-token balance delta for one address. */
export interface BalanceChange {
  address: string;
  asset: string;        // e.g. "ETH"
  before: string;       // pre-formatted decimal string, e.g. "10.0"
  after: string;        // pre-formatted decimal string, e.g. "8.498"
}

/**
 * One ERC-20/721/1155 Transfer event extracted from the receipt.
 * `tokenAddress` is the contract emitting the Transfer — distinct from
 * `token` which is the human symbol like "USDC".
 */
export interface TokenTransfer {
  token: string;         // symbol, e.g. "USDC"
  tokenAddress: string;  // contract address that emitted the event
  from: string;
  to: string;
  amount: string;        // pre-formatted (already divided by decimals)
}

/** State-diff half of the response. */
export interface StateDiffs {
  balanceChanges: BalanceChange[];
  tokenTransfers: TokenTransfer[];
}

/** Full response from GET /api/gas-state/:txHash. */
export interface GasStateResponse {
  txHash: string;
  gasProfiling: GasProfiling;
  stateDiffs: StateDiffs;
}
