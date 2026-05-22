/**
 * Type definitions for the Vulnerability Detection module.
 *
 * Source schema: ../../../../mock_data/security_response.json
 * Owner of source schema: Position 3 — Security Analysis Engineer
 * Design reference: docs/frontend-design.md §5.3
 *
 * The backend wraps Slither (https://github.com/crytic/slither) and reshapes
 * its JSON output to match this schema. Mythril was intentionally cut from
 * Phase 1 scope — Slither covers the rubric's required vulnerability classes.
 *
 * Phase 4 (Adaptation) — loosened to match Position 3's real CLI output:
 *   - `contractAddress` can be null when scanning a local file (no on-chain id).
 *   - `line` can be null when Slither has no source mapping for a finding.
 *   - `scanStatus` adds "CompletedWithNoFindings" (when the scan ran cleanly
 *     and found zero issues — distinct from Failed).
 *   - `error` is set when scanStatus is "Failed" (e.g. solc version missing).
 */

/**
 * Severity levels follow Slither's classification.
 * Mapping to UI color (see SeverityBadge.tsx in later commits):
 *   High          → red
 *   Medium        → orange
 *   Low           → yellow
 *   Informational → blue
 */
export type Severity = "High" | "Medium" | "Low" | "Informational";

/**
 * Scan lifecycle state.
 *   Completed                  → scan ran, ≥1 finding emitted
 *   CompletedWithNoFindings    → scan ran cleanly, zero findings (Phase 4)
 *   Failed                     → scan crashed or couldn't run (error string present)
 *   Pending                    → backend has accepted the request but not finished yet
 */
export type ScanStatus =
  | "Completed"
  | "CompletedWithNoFindings"
  | "Failed"
  | "Pending";

/**
 * One detected issue. `codeSnippet` is the offending Solidity excerpt
 * extracted by the backend — the frontend renders it with syntax
 * highlighting in CodeSnippetViewer (added in Commit 13).
 *
 * `line` may be null when Slither's source-mapping is incomplete
 * (typically for contract-level or pragma-level findings).
 */
export interface Vulnerability {
  id: string;             // backend-assigned id, e.g. "ERR-001"
  type: string;           // category label, e.g. "Reentrancy"
  severity: Severity;
  line: number | null;    // line number in source, or null for whole-contract findings
  description: string;    // human-readable, may contain non-ASCII / Chinese
  codeSnippet: string;    // raw Solidity code lines (pre-extracted)
}

/**
 * Full response from `GET /api/security/:contractAddress` (HTTP)
 * OR from `python backend/security_scan.py <file.sol>` (CLI).
 *
 * Notes:
 *   - `contractAddress` is null when the input was a local file.
 *   - `error` is set (and `scanStatus === "Failed"`) when the scan crashed.
 */
export interface SecurityResponse {
  contractAddress: string | null;
  contractName: string;       // e.g. "VulnerableVault"
  scanStatus: ScanStatus;
  toolsUsed: string[];        // e.g. ["Slither v0.10.0"]
  vulnerabilities: Vulnerability[];
  /** Present only when scanStatus is "Failed". Human-readable cause. */
  error?: string;
}
