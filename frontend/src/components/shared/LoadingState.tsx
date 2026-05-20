/**
 * LoadingState — placeholder shown while SWR is fetching.
 *
 * Design reference: docs/frontend-design.md §10.6
 *
 * Renders a stack of shadcn <Skeleton> bars inside a <Card>. Each consumer
 * (TraceTab / GasStateTab / SecurityTab) decides how many rows to show
 * by passing `rows` — default 3 fits most cases.
 *
 * The Skeleton component is auto-animated via Tailwind keyframes that
 * shadcn ships with — no JS animation needed.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  /** Number of skeleton bars to render. Defaults to 3. */
  rows?: number;
}

export function LoadingState({ rows = 3 }: LoadingStateProps) {
  return (
    <Card>
      <CardContent className="space-y-3 py-6">
        {Array.from({ length: rows }).map((_, i) => (
          // Varying widths give a more natural "loading text" appearance.
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${100 - i * 8}%` }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
