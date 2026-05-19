/**
 * TxHashInput — placeholder for the search bar.
 *
 * Design reference: docs/frontend-design.md §10.2
 *
 * Phase 1 shows only a disabled text field. Commit 14 (Phase 4) expands
 * this into:
 *   - a <Select> dropdown of SAMPLE_TXS (from src/lib/constants.ts)
 *   - a manual <Input> for arbitrary tx hashes (regex validated)
 *   - a separate <Input> for contract addresses (Security tab)
 *   - a "Load" button that calls back into the parent page
 *
 * Why a stub now: the rest of Phase 1 needs *something* to render at the
 * top of the page so the visual hierarchy is correct. Locking the file
 * path early also avoids churn in src/app/page.tsx later.
 */
"use client";
import { Input } from "@/components/ui/input";

export function TxHashInput() {
  return (
    <div className="space-y-2">
      <Input
        placeholder="Paste tx hash or pick a sample (coming in Commit 14)"
        disabled
      />
    </div>
  );
}
