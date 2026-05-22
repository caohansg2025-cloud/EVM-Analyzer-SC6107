/**
 * Header — top navigation bar.
 *
 * Design reference: docs/frontend-design.md §10.1
 *
 * Pure server component (no "use client") — the only interactive child is
 * ConnectWalletButton, which marks itself as a client component. This
 * keeps the static parts (logo, subtitle) rendered on the server for
 * fast initial paint.
 *
 * Tailwind utility classes:
 *   border-b border-border  → 1px border using shadcn's `--border` token
 *   bg-card                 → uses shadcn's `--card` background token
 *   max-w-7xl               → matches the <main> width in layout.tsx
 */
import { ConnectWalletButton } from "./ConnectWalletButton";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">⚙️ EVM Analyzer</span>
          {/* Hidden on phones; SC6107 marker visible from md (≥768px) up. */}
          <span className="text-xs text-muted-foreground hidden md:inline">
            SC6107 · Project 7
          </span>
        </div>
        <ConnectWalletButton />
      </div>
    </header>
  );
}
