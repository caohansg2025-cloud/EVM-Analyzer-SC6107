/**
 * useGasState — fetch and cache the combined Gas Profiling + State Diff response.
 *
 * Design reference: docs/frontend-design.md §7.3
 *
 * Note: the backend exposes Gas and State as a single combined endpoint
 * (`/api/gas-state/:txHash`), so this hook covers both features the
 * Gas & State tab needs. See src/types/gasState.ts for the response shape.
 *
 * SWR caching strategy is identical to useTrace — see that file for rationale.
 */
"use client";
import useSWR from "swr";
import { fetchGasState } from "@/lib/api";

export function useGasState(txHash: string | null) {
  return useSWR(
    txHash ? ["gasState", txHash] : null,
    ([, h]) => fetchGasState(h),
    { revalidateOnFocus: false }
  );
}
