/**
 * SecuritySummary — top-of-tab overview card for the Security view.
 *
 * Design reference: docs/frontend-design.md §10.5
 *
 * Displays five fields and a per-severity count breakdown:
 *   - Contract name (e.g. "VulnerableVault")
 *   - Contract address (truncated, copyable via AddressDisplay)
 *   - Scan status badge (Completed / Failed / Pending)
 *   - Tools used (e.g. "Slither v0.10.0")
 *   - Severity counts (e.g. "1 High · 1 Medium · 0 Low · 0 Informational")
 *
 * Server-renderable — interactive state delegated to AddressDisplay.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import type { SecurityResponse, Severity } from "@/types/security";

interface SecuritySummaryProps {
  data: SecurityResponse;
}

/**
 * Build a severity → count map from the vulnerability list. We initialise
 * all four levels to 0 so the rendered summary always shows every category
 * (it's reassuring to see "0 High" rather than no row at all).
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

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-600 hover:bg-green-600 text-white",
  Failed: "bg-red-600 hover:bg-red-600 text-white",
  Pending: "bg-gray-500 hover:bg-gray-500 text-white",
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
          <Badge className={`${STATUS_COLORS[data.scanStatus] ?? STATUS_COLORS.Pending} text-xs`}>
            {data.scanStatus}
          </Badge>
        </div>

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
