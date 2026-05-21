/**
 * OptimizationHintsCard — backend-supplied gas-optimization advice.
 *
 * Design reference: docs/frontend-design.md §10.4
 *
 * The hint string comes verbatim from the backend
 * (`gasProfiling.optimizationSuggestions`). It may be empty, in which
 * case we render nothing — the parent decides whether to omit it.
 *
 * Visual: yellow-tinted card with Lightbulb icon — yellow is the
 * universal "tip / suggestion" color in DeFi dashboards (Etherscan,
 * Tenderly all use the same convention).
 *
 * The text may contain non-ASCII (e.g. Chinese characters in our mocks);
 * native browser rendering handles this fine — no special encoding needed.
 */
import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OptimizationHintsCardProps {
  /** Free-text advice from the backend. */
  hint: string;
}

export function OptimizationHintsCard({ hint }: OptimizationHintsCardProps) {
  // Hide the card entirely if the backend returned an empty string.
  if (!hint?.trim()) return null;

  return (
    <Card className="border-yellow-500/40 bg-yellow-500/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs uppercase tracking-wide text-yellow-500 font-medium">
              Optimization Hint
            </p>
            <p className="text-sm text-foreground leading-relaxed">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
