/**
 * ErrorState — shown when SWR's fetcher throws.
 *
 * Design reference: docs/frontend-design.md §10.6
 *
 * SWR converts any thrown error (from src/lib/api.ts) into its `error`
 * field. The consuming tab passes it here. Optional `onRetry` wires to
 * SWR's `mutate()` so users can retry without a full page reload.
 *
 * Visual cues:
 *   - destructive-tinted border (red in dark mode)
 *   - AlertCircle icon from lucide-react
 *   - error.message rendered in monospace for stack-trace-like clarity
 */
"use client";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** Any Error (or Error-like object with a `message`). */
  error: Error;
  /** Optional callback — when provided, a "Retry" button is shown. */
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="py-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="font-medium text-destructive">Request failed</p>
            <p className="text-sm font-mono text-muted-foreground break-words">
              {error.message}
            </p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
