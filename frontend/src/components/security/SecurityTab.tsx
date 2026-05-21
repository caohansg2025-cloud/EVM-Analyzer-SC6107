/**
 * SecurityTab — orchestrates the Security view.
 *
 * Design reference: docs/frontend-design.md §10.5
 *
 * Follows the same four-state pattern as TraceTab/GasStateTab:
 *   no input → EmptyState
 *   loading  → LoadingState (more rows for the longer-running Slither scan)
 *   error    → ErrorState with Retry
 *   data     → SecuritySummary + sorted VulnerabilityCard list
 *
 * Vulnerabilities are sorted by severity (High first) so the most
 * critical issues appear at the top of the page without scrolling.
 */
"use client";
import { ShieldCheck } from "lucide-react";
import { useSecurity } from "@/hooks/useSecurity";
import { SecuritySummary } from "./SecuritySummary";
import { VulnerabilityCard } from "./VulnerabilityCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Severity } from "@/types/security";

interface SecurityTabProps {
  /** Null when no contract address is selected. */
  contractAddress: string | null;
}

/** Display order: most severe first. */
const SEVERITY_RANK: Record<Severity, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Informational: 3,
};

export function SecurityTab({ contractAddress }: SecurityTabProps) {
  const { data, error, isLoading, mutate } = useSecurity(contractAddress);

  if (!contractAddress) {
    return (
      <EmptyState message="Enter a contract address to scan for vulnerabilities." />
    );
  }
  if (isLoading) {
    return <LoadingState rows={6} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => mutate()} />;
  }
  if (!data) return null;

  // Stable sort by severity rank — preserves backend insertion order
  // within the same severity (tiebreaker).
  const sorted = [...data.vulnerabilities].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  return (
    <div className="space-y-4">
      <SecuritySummary data={data} />
      {sorted.length === 0 ? (
        <EmptyState
          message="No vulnerabilities detected."
          icon={<ShieldCheck className="w-8 h-8 text-green-500" />}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((v) => (
            <VulnerabilityCard key={v.id} vuln={v} />
          ))}
        </div>
      )}
    </div>
  );
}
