/**
 * TotalGasCard — large headline number showing the transaction's total gas use.
 *
 * Design reference: docs/frontend-design.md §10.4
 *
 * Server-renderable: pure presentation of a single number. The number is
 * formatted with locale-aware thousands separators via `formatNumber()`
 * for legibility (e.g. 125000 → "125,000").
 *
 * The Flame icon from lucide-react gives a quick visual cue that this is
 * a gas/cost metric (the same icon is used in `OptimizationHintsCard`
 * domain — keeps the gas-related cards visually coherent).
 */
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

interface TotalGasCardProps {
  /** Raw gas units consumed by the entire transaction. */
  total: number;
}

export function TotalGasCard({ total }: TotalGasCardProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Gas Used
            </span>
            <span className="text-2xl font-bold font-mono tabular-nums">
              {formatNumber(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
