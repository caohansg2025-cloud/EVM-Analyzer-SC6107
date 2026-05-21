/**
 * SeverityBadge — color-coded label for a vulnerability's severity level.
 *
 * Design reference: docs/frontend-design.md §10.5
 *
 * Color mapping follows industry-standard "stop-light" semantics:
 *   High          → red    (immediate action required)
 *   Medium        → orange (significant risk)
 *   Low           → yellow (minor risk; needs text-black for contrast)
 *   Informational → blue   (not a security issue, just FYI)
 *
 * Pure presentational — safe to render server-side.
 */
import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/types/security";

/**
 * Tailwind class map. The `hover:` colors are deliberately the same as the
 * base — shadcn's Badge applies a slight hover lightening by default that
 * would interfere with the semantic color, so we lock it in place.
 */
const STYLES: Record<Severity, string> = {
  High: "bg-red-600 hover:bg-red-600 text-white",
  Medium: "bg-orange-500 hover:bg-orange-500 text-white",
  Low: "bg-yellow-500 hover:bg-yellow-500 text-black",
  Informational: "bg-blue-500 hover:bg-blue-500 text-white",
};

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge className={`${STYLES[severity]} text-xs font-medium`}>
      {severity}
    </Badge>
  );
}
