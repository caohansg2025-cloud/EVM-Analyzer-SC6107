/**
 * BalanceChangesTable — ETH (native) balance deltas per address.
 *
 * Renders the `stateDiffs.balanceChanges` half of the GasStateResponse.
 * Backend pre-formats `before`/`after` as decimal strings (already
 * divided by 10^18), so the frontend just displays them verbatim and
 * derives the delta for visual cue.
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

function deltaTone(before: string, after: string): string {
  const b = Number(before);
  const a = Number(after);
  if (Number.isNaN(b) || Number.isNaN(a) || a === b) return "text-muted-foreground";
  return a > b ? "text-green-600" : "text-red-600";
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No balance changes.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <AddressDisplay address={row.address} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.asset}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.before}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${deltaTone(row.before, row.after)}`}
                  >
                    {row.after}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
