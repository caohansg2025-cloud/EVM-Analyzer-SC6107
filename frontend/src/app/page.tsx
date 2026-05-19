/**
 * Home page — the only route in the app.
 *
 * Design reference: docs/frontend-design.md §9.3
 *
 * Phase 1 layout: <TxHashInput /> at the top, three <Tabs> below with
 * placeholder content. Each placeholder will be replaced in a later commit:
 *   - <TraceTab>     — Commit 9
 *   - <GasStateTab>  — Commit 12
 *   - <SecurityTab>  — Commit 13
 *
 * Marked `"use client"` because <Tabs> is a Radix-UI primitive that uses
 * client-only React context to coordinate the active tab.
 */
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TxHashInput } from "@/components/input/TxHashInput";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <TxHashInput />
      <Tabs defaultValue="trace" className="w-full">
        {/* Three equal-width tab triggers, capped to a sensible max width. */}
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="gas-state">Gas & State</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Placeholders make it obvious which commit fills each panel. */}
        <TabsContent value="trace">
          <div className="text-muted-foreground py-12 text-center">
            Trace view — coming in Commit 9
          </div>
        </TabsContent>
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
