/**
 * Home page — the only route in the app.
 *
 * Design reference: docs/frontend-design.md §9.3
 *
 * Phase 3 changes vs Phase 2:
 *   - Added `contractAddress` state, seeded from SAMPLE_CONTRACTS[0]
 *     so the Security tab demos data immediately.
 *   - Replaced the Gas & State placeholder with the real <GasStateTab />.
 *   - Replaced the Security placeholder with the real <SecurityTab />.
 *   - All three tabs are now interactive against mock data.
 *
 * `"use client"` is required because Tabs (Radix) uses client context
 * AND because we use useState for both txHash and contractAddress.
 */
"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TxHashInput } from "@/components/input/TxHashInput";
import { TraceTab } from "@/components/trace/TraceTab";
import { GasStateTab } from "@/components/gas-state/GasStateTab";
import { SecurityTab } from "@/components/security/SecurityTab";
import { SAMPLE_TXS, SAMPLE_CONTRACTS } from "@/lib/constants";

export default function HomePage() {
  /*
   * `txHash` drives Trace + Gas & State tabs. `contractAddress` drives the
   * Security tab. Both are seeded with the first sample entry so all
   * three tabs demonstrate themselves without requiring user input
   * (Commit 14 in Phase 4 makes the TxHashInput functional).
   *
   * The `?? null` guards against an empty constants array — TypeScript
   * stays satisfied without `!` non-null assertions.
   */
  const [txHash] = useState<string | null>(SAMPLE_TXS[0]?.txHash ?? null);
  const [contractAddress] = useState<string | null>(
    SAMPLE_CONTRACTS[0]?.address ?? null,
  );

  return (
    <div className="space-y-6">
      <TxHashInput />
      <Tabs defaultValue="trace" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="gas-state">Gas & State</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="trace">
          <TraceTab txHash={txHash} />
        </TabsContent>
        <TabsContent value="gas-state">
          <GasStateTab txHash={txHash} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab contractAddress={contractAddress} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
