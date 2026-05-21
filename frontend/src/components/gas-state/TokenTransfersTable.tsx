/**
 * TokenTransfersTable — ERC-20/721/1155 Transfer events extracted from the receipt.
 *
 * Design reference: docs/frontend-design.md §10.4
 *
 * Renders the `stateDiffs.tokenTransfers` half of the GasStateResponse.
 * Backend decodes Transfer events from logs and pre-formats `amount`
 * (already divided by decimals), so the frontend just displays the
 * strings verbatim.
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
import type { TokenTransfer } from "@/types/gasState";

interface TokenTransfersTableProps {
  rows: TokenTransfer[];
}

export function TokenTransfersTable({ rows }: TokenTransfersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Token Transfers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No token transfers.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <span className="font-medium">{row.token}</span>
                  </TableCell>
                  <TableCell>
                    <AddressDisplay address={row.from} />
                  </TableCell>
                  <TableCell>
                    <AddressDisplay address={row.to} />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.amount}
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
