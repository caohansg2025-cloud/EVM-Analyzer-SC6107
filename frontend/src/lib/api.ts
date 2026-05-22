/**
 * Frontend -> Backend API client.
 *
 * Design reference: docs/frontend-design.md §6.1 ("Most important file")
 * Security routing rationale: docs/security-mock-architecture.md
 *
 * STRATEGY: "Mock-first switch"
 *   When NEXT_PUBLIC_USE_MOCKS=true:
 *     -> returns the canned JSON from src/mocks/ after a 300ms delay.
 *     -> Used for fully-offline frontend dev when the backend isn't running.
 *   When NEXT_PUBLIC_USE_MOCKS=false:
 *     -> fetches from the real backend at NEXT_PUBLIC_API_BASE_URL.
 *     -> The backend itself decides whether to mock or to query Alchemy/Slither.
 *
 * Endpoint conventions:
 *   GET /api/trace/:txHash       -> TraceResponse
 *   GET /api/gas-state/:txHash   -> GasStateResponse   (combined endpoint)
 *   GET /api/security/:address   -> SecurityResponse
 *
 * Security routing — special case:
 *   The backend's mock mode hard-codes ONE security JSON file and only swaps
 *   the contractAddress field, so picking different contracts in the dropdown
 *   would show identical findings. To deliver demo variety without requiring
 *   real Slither setup (solc-select + Slither + ~15s/scan), the frontend
 *   keeps a per-address override map for the four known sample contracts.
 *   Arbitrary pasted addresses fall through to the standard env-flag logic.
 *
 *   See docs/security-mock-architecture.md for the full rationale and the
 *   path back to pure backend-driven routing when the team is ready.
 */

import traceMock from "@/mocks/trace_response.json";
import gasStateMock from "@/mocks/gas_state_response.json";
import securityMockDefault from "@/mocks/security_response.json";
import securityAccessControlMock from "@/mocks/security_access_control.json";
import securityUncheckedCallMock from "@/mocks/security_unchecked_call.json";
import securityOverflowTokenMock from "@/mocks/security_overflow_token.json";
import type { TraceResponse } from "@/types/trace";
import type { GasStateResponse } from "@/types/gasState";
import type { SecurityResponse } from "@/types/security";

/** Toggle: any value other than the literal string "false" is treated as true. */
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

/** Base URL for the real backend. Empty string -> same-origin fetch. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Small async delay used to simulate backend latency on mock data. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Generic typed GET helper. Throws on non-2xx -- SWR converts thrown errors
 * into its `error` field, which the UI maps to <ErrorState>.
 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

/**
 * Per-contract security mock map. Keys are lower-cased so case-insensitive
 * matching works regardless of how the dropdown stores the address.
 * Only the four KNOWN sample contracts are routed here; arbitrary pasted
 * addresses fall through to the env-flag logic.
 */
const SECURITY_MOCKS_BY_ADDRESS: Record<string, SecurityResponse> = {
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": securityMockDefault as SecurityResponse,
  "0x1111111111111111111111111111111111111111": securityAccessControlMock as SecurityResponse,
  "0x2222222222222222222222222222222222222222": securityUncheckedCallMock as SecurityResponse,
  "0x3333333333333333333333333333333333333333": securityOverflowTokenMock as SecurityResponse,
};

/* -- PUBLIC API ---------------------------------------------------------- */

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
  // Step 1 — per-address override for the four known sample contracts.
  // Always wins over the env-flag logic. See security-mock-architecture.md.
  const override = SECURITY_MOCKS_BY_ADDRESS[contractAddress.toLowerCase()];
  if (override) {
    await sleep(300);
    return { ...override, contractAddress };
  }

  // Step 2 — arbitrary pasted address: fall through to mock-or-live switch.
  if (USE_MOCKS) {
    await sleep(300);
    return securityMockDefault as SecurityResponse;
  }
  return getJson<SecurityResponse>(`${API_BASE}/api/security/${contractAddress}`);
}
