/**
 * Home page — the only route in the app.
 *
 * Design reference: docs/frontend-design.md §9.3
 *
 * Phase 2 changes vs Phase 1:
 *   - Added `txHash` state, defaulting to the first SAMPLE_TXS entry so
 *     the Trace tab demos data immediately on first load.
 *   - Replaced the Trace placeholder with the real <TraceTab /> component.
 *   - The Gas & State and Security tabs still show "coming in Commit N"
 *     placeholders — they're filled in Phase 3.
 *
 * `"use client"` is required because <Tabs> (Radix-based) uses client
 * context, AND because we use React.useState for txHash.
 */
"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TxHashInput } from "@/components/input/TxHashInput";
import { TraceTab } from "@/components/trace/TraceTab";
import { SAMPLE_TXS } from "@/lib/constants";

export default function HomePage() {
  /*
   * txHash governs which transaction the Trace tab fetches. We seed it
   * with the first sample so the page is "self-demonstrating" — without
   * Commit 14's input box being functional yet, the only way to show
   * actual data in Phase 2 is to pre-populate.
   *
   * The `?? null` fallback handles the (impossible-here) case where
   * SAMPLE_TXS is empty, so TypeScript is satisfied without `!` non-null
   * assertions.
   */
  const [txHash] = useState<string | null>(SAMPLE_TXS[0]?.txHash ?? null);

  return (
    <div className="space-y-6">
      <TxHashInput />
      <Tabs defaultValue="trace" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="gas-state">Gas & State</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Live in Phase 2: */}
        <TabsContent value="trace">
          <TraceTab txHash={txHash} />
        </TabsContent>

        {/* Placeholders for Phase 3 / 4: */}
        <TabsContent value="gas-state">
          <div className="text-muted-foreground py-12 text-center">
            Gas & State view — coming in Commit 12
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="text-muted-foreground py-12 text-center">
            Security view — coming in Commit 13
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
