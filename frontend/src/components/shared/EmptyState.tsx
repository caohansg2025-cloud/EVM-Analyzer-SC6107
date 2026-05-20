/**
 * EmptyState — shown when there is no data to display *and* nothing went
 * wrong. Typical case: the user hasn't entered a tx hash yet.
 *
 * Design reference: docs/frontend-design.md §10.6
 *
 * Distinct from LoadingState (data is on its way) and ErrorState (fetch
 * failed). Keeping the three states separate gives the UI a clear voice.
 */
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  /** Headline message. */
  message: string;
  /** Optional icon override. Defaults to lucide-react <Inbox/>. */
  icon?: ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="opacity-60">
          {icon ?? <Inbox className="w-8 h-8" />}
        </div>
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}
