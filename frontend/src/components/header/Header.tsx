/**
 * Header — top navigation bar.
 *
 * Design reference: docs/frontend-design.md §10.1
 *
 * Server component for the static brand block; the right-side wallet
 * button + data-mode indicator are client components.
 *
 * Tailwind utility classes:
 *   border-b border-border  -> 1px border using shadcn's --border token
 *   bg-card                 -> uses shadcn's --card background token
 *   max-w-7xl               -> matches the <main> width in layout.tsx
 */
import { ConnectWalletButton } from "./ConnectWalletButton";
import { DataModeIndicator } from "./DataModeIndicator";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">⚙️ EVM Analyzer</span>
          {/* Hidden on phones; SC6107 marker visible from md (>=768px) up. */}
          <span className="text-xs text-muted-foreground hidden md:inline">
            SC6107 · Project 7
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DataModeIndicator />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
