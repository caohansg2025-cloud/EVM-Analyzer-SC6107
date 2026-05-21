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

/** Scan lifecycle state — backend may return Pending while Slither is still running. */
export type ScanStatus = "Completed" | "Failed" | "Pending";

/**
 * One detected issue. `codeSnippet` is the offending Solidity excerpt
 * extracted by the backend — the frontend renders it with syntax
 * highlighting in CodeSnippetViewer (added in Commit 13).
 */
export interface Vulnerability {
  id: string;           // backend-assigned id, e.g. "ERR-001"
  type: string;         // category label, e.g. "Reentrancy"
  severity: Severity;
  line: number;         // line number in the contract source
  description: string;  // human-readable, may contain non-ASCII / Chinese
  codeSnippet: string;  // raw Solidity code lines (pre-extracted)
}

/** Full response from POST /api/scan or GET /api/security/:contractAddress. */
export interface SecurityResponse {
  contractAddress: string;
  contractName: string;       // e.g. "VulnerableVault"
  scanStatus: ScanStatus;
  toolsUsed: string[];        // e.g. ["Slither v0.10.0"]
  vulnerabilities: Vulnerability[];
}
