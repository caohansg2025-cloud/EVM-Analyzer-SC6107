/**
 * useTrace — fetch and cache the Transaction Trace.
 *
 * Design reference: docs/frontend-design.md §7.2
 *
 * Built on SWR (https://swr.vercel.app/). The hook:
 *   - returns `data`, `error`, `isLoading` for the calling component
 *   - dedupes simultaneous calls for the same key
 *   - caches across tab switches so re-clicks are instant
 *   - skips fetching entirely when `txHash` is null (no input yet)
 *
 * `revalidateOnFocus: false` because trace data is immutable per tx;
 * refreshing it when the user tabs back to the browser would only waste
 * RPC quota.
 */
"use client";
import useSWR from "swr";
import { fetchTrace } from "@/lib/api";

export function useTrace(txHash: string | null) {
  return useSWR(
    // Conditional key: null disables the request, otherwise SWR fetches.
    txHash ? ["trace", txHash] : null,
    // Destructure the key tuple to get the hash back.
    ([, h]) => fetchTrace(h),
    { revalidateOnFocus: false }
  );
}
