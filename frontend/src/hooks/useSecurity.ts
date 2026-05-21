/**
 * useSecurity — fetch and cache Slither vulnerability scan results.
 *
 * Design reference: docs/frontend-design.md §7.4
 *
 * Keyed on `contractAddress` rather than `txHash` because Slither scans
 * contract bytecode/source, not individual transactions. The scan can
 * take a while (Slither + solc compile), but SWR caching ensures we only
 * pay for it once per contract per session.
 */
"use client";
import useSWR from "swr";
import { fetchSecurity } from "@/lib/api";

export function useSecurity(contractAddress: string | null) {
  return useSWR(
    contractAddress ? ["security", contractAddress] : null,
    ([, addr]) => fetchSecurity(addr),
    { revalidateOnFocus: false }
  );
}
