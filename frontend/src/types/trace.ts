/**
 * Type definitions for the Transaction Trace Analysis module.
 *
 * Source schema: ../../../../mock_data/trace_response.json (locked inter-team contract)
 * Owner of source schema: Position 1 — Transaction Trace Engineer
 * Design reference: docs/frontend-design.md §5.1
 * "Iron rule": key names and nesting MUST match the JSON schema exactly.
 */

/**
 * EVM call types as emitted by `debug_traceTransaction` with `callTracer`.
 * - CALL          : standard message call between contracts
 * - DELEGATECALL  : caller's context preserved (used by proxy/library patterns)
 * - STATICCALL    : read-only call, cannot modify state
 * - CREATE        : contract deployment
 */
export type CallType = "CALL" | "DELEGATECALL" | "STATICCALL" | "CREATE";

/** Top-level transaction status returned by the backend. */
export type TxStatus = "Success" | "Failed";

/**
 * A single node in the call-tree. Recursive via `calls[]`.
 *
 * Note: `value` and `gasUsed` are backend-formatted:
 *  - `value` is a display string like "1.5 ETH" (already converted from wei)
 *  - `gasUsed` is a plain decimal number (not a hex string)
 *
 * The recursive shape mirrors the Geth/Erigon `callTracer` output.
 */
export interface CallNode {
  type: CallType;
  from: string;          // 0x-prefixed 20-byte hex address
  to: string;            // 0x-prefixed 20-byte hex address
  value: string;         // pre-formatted, e.g. "1.5 ETH", "0 ETH"
  gasUsed: number;       // gas units consumed by this frame
  functionName: string;  // decoded signature, e.g. "transfer(address,uint256)"
  calls: CallNode[];     // child calls (empty array if leaf)
}

/**
 * Full response from GET /api/trace/:txHash.
 * The frontend treats this as opaque — backend owns the decoding pipeline.
 */
export interface TraceResponse {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  status: TxStatus;
  traceTree: CallNode;
}
