/**
 * BalanceChangesTable — ETH / native-token balance deltas per address.
 *
 * Design reference: docs/frontend-design.md §10.4
 *
 * Renders the `stateDiffs.balanceChanges` half of the GasStateResponse.
 * The Δ (delta) column is computed client-side from `before` and `after`
 * strings; we use `Number()` because the mock values are small floats.
 *
 * ⚠️ In a production deployment, balances can exceed Number.MAX_SAFE_INTEGER
 *   when expressed in wei (18 decimals). Replace with BigInt arithmetic when
 *   the backend switches to non-pre-formatted values. For Phase 3 with the
 *   locked mock schema, simple float math is adequate.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import type { BalanceChange } from "@/types/gasState";

interface BalanceChangesTableProps {
  rows: BalanceChange[];
}

export function BalanceChangesTable({ rows }: BalanceChangesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Balance Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Before</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead className="text-right">Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No balance changes.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => {
                // Parse the formatted strings as floats. See ⚠️ comment above.
                const delta = Number(row.after) - Number(row.before);
                // Sign-prefix the delta so positive amounts show "+0.12".
                const deltaStr =
                  (delta >= 0 ? "+" : "") + delta.toFixed(3);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <AddressDisplay address={row.address} />
                    </TableCell>
                    <TableCell className="font-medium">{row.asset}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.before}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {row.after}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono tabular-nums ${
                        delta >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {deltaStr}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
