/**
 * Frontend → Backend API client.
 *
 * Design reference: docs/frontend-design.md §6.1 ("Most important file")
 *
 * STRATEGY: "Mock-first switch"
 *   When NEXT_PUBLIC_USE_MOCKS=true   (default for local dev / Phase 1–3):
 *     → returns the canned JSON from src/mocks/ after a 300ms delay.
 *   When NEXT_PUBLIC_USE_MOCKS=false  (Phase 4 / Commit 16 integration):
 *     → fetches from the real backend at NEXT_PUBLIC_API_BASE_URL.
 *
 * The single env flag is the entire integration switch — no other code
 * needs to change on Day 4. This minimises schema-drift risk because the
 * frontend was always typed against the locked mocks.
 *
 * Endpoint conventions are confirmed with the Backend Integration
 * Engineer (Position 4 in revised role split):
 *   GET /api/trace/:txHash       → TraceResponse
 *   GET /api/gas-state/:txHash   → GasStateResponse   (combined endpoint)
 *   GET /api/security/:address   → SecurityResponse
 */

import traceMock from "@/mocks/trace_response.json";
import gasStateMock from "@/mocks/gas_state_response.json";
import securityMock from "@/mocks/security_response.json";
import type { TraceResponse } from "@/types/trace";
import type { GasStateResponse } from "@/types/gasState";
import type { SecurityResponse } from "@/types/security";

/** Toggle: any value other than the literal string "false" is treated as true. */
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

/** Base URL for the real backend. Empty string ⇒ same-origin fetch. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Small async delay used to simulate backend latency on mock data. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Generic typed GET helper. Throws on non-2xx — SWR converts thrown errors
 * into its `error` field, which the UI maps to <ErrorState> (Commit 6+).
 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

/* ── PUBLIC API ───────────────────────────────────────────────────────── */

export async function fetchTrace(txHash: string): Promise<TraceResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return traceMock as TraceResponse;
  }
  return getJson<TraceResponse>(`${API_BASE}/api/trace/${txHash}`);
}

export async function fetchGasState(txHash: string): Promise<GasStateResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return gasStateMock as GasStateResponse;
  }
  return getJson<GasStateResponse>(`${API_BASE}/api/gas-state/${txHash}`);
}

export async function fetchSecurity(contractAddress: string): Promise<SecurityResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return securityMock as SecurityResponse;
  }
  return getJson<SecurityResponse>(`${API_BASE}/api/security/${contractAddress}`);
}
