/**
 * TraceMetaCard — top-of-tab summary card for a Transaction Trace.
 *
 * Design reference: docs/frontend-design.md §10.3
 *
 * Displays four key fields in a responsive grid:
 *   - Tx Hash    (long-truncation, click-to-copy)
 *   - Status     (green / red badge)
 *   - Block #    (locale-formatted with thousands separator)
 *   - From → To  (short-truncation addresses with arrow between)
 *
 * Server-renderable (no `"use client"`) because all interactive state is
 * confined to the AddressDisplay children, which mark themselves as
 * client components.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { formatNumber } from "@/lib/format";
import type { TraceResponse } from "@/types/trace";

interface TraceMetaCardProps {
  data: TraceResponse;
}

export function TraceMetaCard({ data }: TraceMetaCardProps) {
  // Map status to a Tailwind color class. Green = success, red = failure.
  const statusClass =
    data.status === "Success"
      ? "bg-green-600 hover:bg-green-600 text-white"
      : "bg-red-600 hover:bg-red-600 text-white";

  return (
    <Card>
      <CardContent className="py-4">
        {/*
         * 2-col on small screens, 4-col on md+. Each cell is a labelled
         * field — the label is muted, the value is the primary content.
         */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Tx Hash">
            <AddressDisplay address={data.txHash} length="long" />
          </Field>

          <Field label="Status">
            <Badge className={`${statusClass} text-xs`}>{data.status}</Badge>
          </Field>

          <Field label="Block #">
            <span className="font-mono text-sm tabular-nums">
              {formatNumber(data.blockNumber)}
            </span>
          </Field>

          <Field label="From → To">
            <span className="flex items-center gap-1 text-sm">
              <AddressDisplay address={data.from} />
              <span className="text-muted-foreground">→</span>
              <AddressDisplay address={data.to} />
            </span>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Internal label/value pair using <dt>/<dd> for semantic HTML.
 * Kept inline because it's only used here and is too small to warrant
 * its own file.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
