/**
 * GasBreakdownChart — horizontal bar chart of gas usage by function.
 *
 * Design reference: docs/frontend-design.md §10.4
 * Recharts docs:    https://recharts.org/en-US/api/BarChart
 *
 * CRITICAL: this file MUST be marked "use client". Recharts touches
 * `window` at module load (for ResponsiveContainer's resize listener),
 * which would crash SSR. `next.config.ts` already has Recharts in
 * `transpilePackages` so the build can process its ESM properly.
 *
 * Visual choices:
 *   - Horizontal layout (functions on Y, percentage on X) so long function
 *     names don't get truncated.
 *   - Each bar gets a distinct color from a 5-color palette so adjacent
 *     bars never blend. The colors cycle if there are more than 5 entries.
 *   - X-axis is fixed to [0, 100] so percentages are comparable.
 *   - Container height scales with row count so each bar gets ~40px.
 */
"use client";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GasBreakdownEntry } from "@/types/gasState";

/** 5-color palette tuned for dark-mode background. */
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

interface GasBreakdownChartProps {
  entries: GasBreakdownEntry[];
}

export function GasBreakdownChart({ entries }: GasBreakdownChartProps) {
  // Allocate ~40px per row, with a minimum so single-entry charts don't squash.
  const chartHeight = Math.max(200, entries.length * 48);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Gas Breakdown by Function</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={entries}
            layout="vertical"
            margin={{ top: 5, right: 24, left: 24, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              type="category"
              dataKey="function"
              width={160}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              // Recharts types `value` as ValueType | undefined; we coerce
              // safely because percentage is always a number in our schema.
              formatter={(value) => [`${value as number}%`, "Gas share"]}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
              {entries.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
