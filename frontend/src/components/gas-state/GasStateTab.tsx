/**
 * GasStateTab — orchestrates the Gas & State view.
 *
 * Design reference: docs/frontend-design.md §10.4
 *
 * Mirrors the TraceTab pattern exactly:
 *   1. Take a `txHash` prop (null when nothing entered).
 *   2. Call `useGasState` SWR hook.
 *   3. Branch on { empty, loading, error, data } states.
 *
 * When data is present, layout is a 2-column responsive grid:
 *   - Left column:  Total gas card + bar chart + optimization hint
 *   - Right column: balance changes table + token transfers table
 *
 * On narrow viewports (< lg breakpoint), the grid collapses to one column.
 */
"use client";
import { useGasState } from "@/hooks/useGasState";
import { TotalGasCard } from "./TotalGasCard";
import { GasBreakdownChart } from "./GasBreakdownChart";
import { OptimizationHintsCard } from "./OptimizationHintsCard";
import { BalanceChangesTable } from "./BalanceChangesTable";
import { TokenTransfersTable } from "./TokenTransfersTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

interface GasStateTabProps {
  /** Null when the user hasn't picked a transaction yet. */
  txHash: string | null;
}

export function GasStateTab({ txHash }: GasStateTabProps) {
  const { data, error, isLoading, mutate } = useGasState(txHash);

  if (!txHash) {
    return (
      <EmptyState message="Enter a transaction hash to see gas profile and state changes." />
    );
  }
  if (isLoading) {
    return <LoadingState rows={5} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => mutate()} />;
  }
  if (!data) {
    // Unreachable when isLoading/error are false; keeps TS happy.
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <TotalGasCard total={data.gasProfiling.totalGasUsed} />
        <GasBreakdownChart entries={data.gasProfiling.breakdown} />
        <OptimizationHintsCard hint={data.gasProfiling.optimizationSuggestions} />
      </div>
      <div className="space-y-4">
        <BalanceChangesTable rows={data.stateDiffs.balanceChanges} />
        <TokenTransfersTable rows={data.stateDiffs.tokenTransfers} />
      </div>
    </div>
  );
}
