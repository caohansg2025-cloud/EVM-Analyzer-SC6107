/**
 * Type definitions for the Vulnerability Detection module.
 *
 * Source schema: ../../../../mock_data/security_response.json
 * Owner of source schema: Position 3 — Security Analysis Engineer
 * Design reference: docs/frontend-design.md §5.3
 *
 * Backend integration (Phase 5):
 * The live endpoint is `GET /api/security/{address}` exposed by
 * `backend/app/main.py`. In mock mode it replays the canonical JSON;
 * in real mode it invokes Slither via `backend/security_scan.py` and
 * reshapes the output. Either way, the wire format is captured below.
 *
 * Note: `contractAddress` is always a string on the wire because the
 * backend handler overrides it to the requested address (even when the
 * underlying mock has `null`). `line` and `error` are the only optional
 * shapes the frontend has to defend against.
 */

/**
 * Severity levels follow Slither's classification.
 *   High          → red
 *   Medium        → orange
 *   Low           → yellow
 *   Informational → blue
 */
export type Severity = "High" | "Medium" | "Low" | "Informational";

/**
 * Scan lifecycle state.
 *   Completed                → scan ran, ≥1 finding emitted
 *   CompletedWithNoFindings  → scan ran cleanly, zero findings
 *   Failed                   → scanner crashed (e.g. missing solc version)
 *   Pending                  → backend accepted the request but isn't done yet
 */
export type ScanStatus =
  | "Completed"
  | "CompletedWithNoFindings"
  | "Failed"
  | "Pending";

/**
 * One detected issue. `codeSnippet` is the offending Solidity excerpt
 * extracted by the backend — the frontend renders it with syntax
 * highlighting in CodeSnippetViewer.
 *
 * `line` may be null when Slither has no source-mapping for a finding
 * (typical for pragma-level or contract-level checks).
 */
export interface Vulnerability {
  id: string;             // backend-assigned id, e.g. "ERR-001"
  type: string;           // category label, e.g. "Reentrancy"
  severity: Severity;
  line: number | null;    // line number in source, or null for whole-contract findings
  description: string;    // human-readable
  codeSnippet: string;    // raw Solidity code lines (pre-extracted)
}

/**
 * Full response from `GET /api/security/{address}`.
 *
 * - `contractAddress` is always the address the frontend requested
 *   (backend overrides whatever the underlying mock contained).
 * - `error` is populated only when `scanStatus === "Failed"`.
 */
export interface SecurityResponse {
  contractAddress: string;
  contractName: string;       // e.g. "VulnerableVault"
  scanStatus: ScanStatus;
  toolsUsed: string[];        // e.g. ["Slither v0.11.5"]
  vulnerabilities: Vulnerability[];
  /** Present only when scanStatus is "Failed". Human-readable cause. */
  error?: string;
}
