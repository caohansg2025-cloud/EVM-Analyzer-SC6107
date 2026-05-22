/**
 * SecuritySummary — top-of-tab overview card for the Security view.
 *
 * Design reference: docs/frontend-design.md §10.5
 *
 * Displays:
 *   - Contract name (e.g. "VulnerableVault")
 *   - Contract address (truncated, copyable via AddressDisplay)
 *   - Scan status badge (Completed / CompletedWithNoFindings / Failed / Pending)
 *   - Inline error block when scanStatus === "Failed"  ← Phase 5
 *   - Tools used (e.g. "Slither v0.11.5")
 *   - Per-severity counts (e.g. "1 High · 0 Medium · 0 Low · 2 Info")
 *
 * Server-renderable — interactive state delegated to AddressDisplay.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import type { SecurityResponse, ScanStatus, Severity } from "@/types/security";

interface SecuritySummaryProps {
  data: SecurityResponse;
}

/**
 * Build a severity → count map from the vulnerability list. Pre-initialise
 * all four levels to 0 so the rendered summary always shows every category.
 */
function buildCounts(data: SecurityResponse): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    High: 0,
    Medium: 0,
    Low: 0,
    Informational: 0,
  };
  for (const v of data.vulnerabilities) counts[v.severity]++;
  return counts;
}

/** Tailwind class for the status badge. */
const STATUS_COLORS: Record<ScanStatus, string> = {
  Completed: "bg-green-600 hover:bg-green-600 text-white",
  CompletedWithNoFindings: "bg-emerald-600 hover:bg-emerald-600 text-white",
  Failed: "bg-red-600 hover:bg-red-600 text-white",
  Pending: "bg-gray-500 hover:bg-gray-500 text-white",
};

/** Friendlier short label for the badge. */
const STATUS_LABELS: Record<ScanStatus, string> = {
  Completed: "Completed",
  CompletedWithNoFindings: "No findings",
  Failed: "Failed",
  Pending: "Pending",
};

export function SecuritySummary({ data }: SecuritySummaryProps) {
  const counts = buildCounts(data);

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">{data.contractName}</h2>
            <AddressDisplay address={data.contractAddress} length="long" />
          </div>
          <Badge className={`${STATUS_COLORS[data.scanStatus]} text-xs`}>
            {STATUS_LABELS[data.scanStatus]}
          </Badge>
        </div>

        {/* Phase 5 — surface the backend error message when Slither failed. */}
        {data.scanStatus === "Failed" && data.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/40 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-destructive font-medium mb-1">
              Scanner error
            </p>
            <p className="text-sm font-mono text-foreground break-words">
              {data.error}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
          <span>
            <span className="uppercase tracking-wide mr-1">Tools:</span>
            {data.toolsUsed.join(", ")}
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            <span className="text-red-500 font-medium">{counts.High} High</span>
            {" · "}
            <span className="text-orange-500 font-medium">{counts.Medium} Medium</span>
            {" · "}
            <span className="text-yellow-500 font-medium">{counts.Low} Low</span>
            {" · "}
            <span className="text-blue-500 font-medium">{counts.Informational} Info</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
