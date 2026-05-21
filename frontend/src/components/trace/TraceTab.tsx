/**
 * TraceTab — orchestrates the Trace view.
 *
 * Design reference: docs/frontend-design.md §10.3
 *
 * Responsibilities:
 *   1. Take a `txHash` prop from the page (null when nothing's entered).
 *   2. Call `useTrace` to get { data, error, isLoading, mutate }.
 *   3. Pick the right state to render:
 *        no input        → EmptyState (prompt the user to search)
 *        fetching        → LoadingState (skeleton bars)
 *        fetch failed    → ErrorState (red card + Retry button)
 *        success         → TraceMetaCard + CallTreeNode(root, depth=0)
 *
 * Keeping the four states explicit (rather than relying on truthy/falsy
 * short-circuits) makes the UX predictable and the code grep-friendly.
 */
"use client";
import { useTrace } from "@/hooks/useTrace";
import { TraceMetaCard } from "./TraceMetaCard";
import { CallTreeNode } from "./CallTreeNode";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

interface TraceTabProps {
  /** Null when the user hasn't picked a transaction yet. */
  txHash: string | null;
}

export function TraceTab({ txHash }: TraceTabProps) {
  // `mutate` lets us invalidate the SWR cache on Retry click.
  const { data, error, isLoading, mutate } = useTrace(txHash);

  if (!txHash) {
    return (
      <EmptyState message="Enter a transaction hash to see its call trace." />
    );
  }
  if (isLoading) {
    return <LoadingState rows={5} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => mutate()} />;
  }
  if (!data) {
    // Should be unreachable when isLoading/error are false, but TS doesn't
    // know that — explicit fallback keeps the compiler happy.
    return null;
  }

  return (
    <div className="space-y-4">
      <TraceMetaCard data={data} />
      {/*
       * Root of the recursive tree. The CallTreeNode handles all further
       * depth and expand/collapse on its own.
       */}
      <Card>
        <CallTreeNode node={data.traceTree} depth={0} />
      </Card>
    </div>
  );
}

/* Tiny inline wrapper to keep the tree visually contained without
 * importing the full <Card> styling boilerplate twice. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card py-2">
      {children}
    </div>
  );
}
