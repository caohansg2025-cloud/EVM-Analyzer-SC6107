/**
 * Home page — the only route in the app.
 *
 * Design reference: docs/frontend-design.md §9.3
 *
 * Phase 4 changes vs Phase 3:
 *   - `txHash` and `contractAddress` state now have setters (Phase 3 was
 *     read-only). They are passed to the now-functional TxHashInput.
 *   - The user can change either via the sample dropdown or manual entry.
 *
 * `"use client"` is required for the useState calls and Radix Tabs context.
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
   * Both states are seeded with the first sample entry so the page is
   * self-demonstrating on first load. Phase 4 unlocks TxHashInput, so
   * users can now change either value via the UI.
   */
  const [txHash, setTxHash] = useState<string | null>(SAMPLE_TXS[0]?.txHash ?? null);
  const [contractAddress, setContractAddress] = useState<string | null>(
    SAMPLE_CONTRACTS[0]?.address ?? null,
  );

  return (
    <div className="space-y-6">
      <TxHashInput
        currentTxHash={txHash}
        currentContract={contractAddress}
        onTxHashChange={setTxHash}
        onContractChange={setContractAddress}
      />
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
