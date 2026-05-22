# Phase 1 Verification & Code Reference

> **Scope**: Day 1 of the frontend build — Commits 1 through 5 of the 18-commit roadmap.
> **Owner**: Web3 Frontend Engineer (Role #4).
> **Status**: ✅ Complete and verified.
> **Generated**: end of Phase 1 implementation session.

This document serves three purposes:

1. **Verification record** — every check we ran and what its expected output is, so anyone can re-verify Phase 1 in under 5 minutes.
2. **Code reference** — file-by-file explanation of what was written, why, and what depends on what.
3. **Dependency map** — every npm package installed, what we use it for, and what it would cost to swap out.

If you want to skim, read §1 (verification commands), §3 (file inventory), and §5 (dependency table). If you want to understand the system, read all of it.

---

## Table of Contents

1. [Verification — How to Re-confirm Phase 1](#1-verification--how-to-re-confirm-phase-1)
2. [Verification Results from This Session](#2-verification-results-from-this-session)
3. [File Inventory & Completeness Check](#3-file-inventory--completeness-check)
4. [Architecture — How the Pieces Connect](#4-architecture--how-the-pieces-connect)
5. [Dependencies — Every Package Explained](#5-dependencies--every-package-explained)
6. [File-by-File Reference](#6-file-by-file-reference)
7. [Known Issues & Workarounds](#7-known-issues--workarounds)
8. [Phase 1 Sign-off Checklist](#8-phase-1-sign-off-checklist)

---

## 1. Verification — How to Re-confirm Phase 1

Run these four commands in order. They take ~30 seconds total. The expected exit code for each is **0**.

### 1.1 Type check

```bash
cd D:/NTU/SC6107/EVM-Analyzer-SC6107-main/frontend
npx tsc --noEmit
```

**Expected output** (after the npm warning lines): no errors. Exit code 0.

**What this proves**:
- All TypeScript files compile under `strict: true`.
- Mock JSON files match the TypeScript interfaces (the `as TraceResponse` casts in `src/lib/api.ts` would fail at compile time if a key was missing).
- The `@/*` path alias resolves correctly.

### 1.2 Lint

```bash
npm run lint
```

**Expected output**: no warnings, no errors (or only the unrelated npm `node_global` config warnings). Exit code 0.

**What this proves**:
- No unused imports / variables.
- Consistent code style (single quotes, semicolons, etc.) per `eslint.config.mjs`.
- React hook rules satisfied (no conditional hook calls, etc.).

### 1.3 Production build

```bash
npm run build
```

**Expected output** (last lines):

```
✓ Compiled successfully in ~3s
  Running TypeScript ...
  Finished TypeScript in ~4s
  Collecting page data using 5 workers ...
  Generating static pages using 5 workers (4/4) in ~1s
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
```

**What this proves**:
- The Next.js bundler can produce a production build with no SSR errors.
- All pages prerender as static content (no runtime errors during build).
- Turbopack works with our codebase.

### 1.4 Runtime smoke test

In one terminal:

```bash
npm run dev
```

**Expected first lines**:

```
▲ Next.js 16.2.6 (Turbopack)
- Local:         http://localhost:3000
- Environments: .env.local
✓ Ready in <1000ms
```

Then in another terminal (or browser):

```bash
curl http://localhost:3000
```

**Expected**: HTTP 200, response body contains the strings:

| String | Where it appears |
|---|---|
| `EVM Analyzer` | Header brand |
| `SC6107 · Project 7` | Header subtitle |
| `Connect Wallet` | Header button |
| `Trace`, `Gas &amp; State`, `Security` | Tab labels |
| `coming in Commit` | Placeholder text in each tab |
| `dark` | The `dark` class on `<html>` for shadcn theming |

**What this proves**:
- The app renders without runtime errors.
- Server-side rendering works (these strings are in the initial HTML, not added via client JS).
- All shadcn primitives load correctly.

---

## 2. Verification Results from This Session

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ exit 0 |
| ESLint | `npm run lint` | ✅ exit 0 |
| Production build | `npm run build` | ✅ exit 0 — Compiled in 3.1s, TS in 3.8s, 4 static pages in 839ms |
| Dev server startup | `npm run dev` | ✅ Ready in 849ms |
| HTTP fetch | `Invoke-WebRequest http://localhost:3001` | ✅ HTTP 200, 22700 bytes |
| String: "EVM Analyzer" | grep response body | ✅ found |
| String: "SC6107 · Project 7" | grep response body | ✅ found |
| String: "Connect Wallet" | grep response body | ✅ found |
| String: "Trace" tab | grep response body | ✅ found |
| String: "Gas &amp; State" tab | grep response body | ✅ found |
| String: "Security" tab | grep response body | ✅ found |
| String: "coming in Commit" | grep response body | ✅ found |
| String: "dark" class | grep response body | ✅ found |

**Conclusion**: 13/13 verification checks pass. Phase 1 is complete and runnable.

---

## 3. File Inventory & Completeness Check

The plan in `docs/frontend-commits.md` listed every file Phase 1 should produce. Below is the actual inventory after implementation, grouped by category.

### 3.1 Auto-generated by tooling (do not hand-edit)

| Path | Generator | Purpose |
|---|---|---|
| `package.json` | `create-next-app` | Dependency manifest, npm scripts |
| `package-lock.json` | `npm install` | Pinned dep versions |
| `tsconfig.json` | `create-next-app` | TypeScript compiler config |
| `next-env.d.ts` | Next.js | Ambient types for Next.js |
| `postcss.config.mjs` | `create-next-app` | PostCSS pipeline (Tailwind 4) |
| `eslint.config.mjs` | `create-next-app` | ESLint flat config |
| `components.json` | `shadcn init` | shadcn/ui project config |
| `src/lib/utils.ts` | `shadcn init` | `cn()` className merger |
| `src/components/ui/*.tsx` (10 files) | `shadcn add` | UI primitives (button, card, tabs, badge, table, input, select, accordion, skeleton, sonner) |
| `src/app/globals.css` | `create-next-app` + `shadcn init` | Tailwind v4 entry, CSS variable theme |
| `src/app/favicon.ico` | `create-next-app` | Browser tab icon |

### 3.2 Hand-written / hand-modified

| Path | Status | Purpose |
|---|---|---|
| `next.config.ts` | ✏️ modified | Added `transpilePackages` for Recharts/syntax-highlighter |
| `.env.local` | ✨ new | Local-only env vars |
| `.env.example` | ✨ new | Committed template for teammates |
| `src/app/layout.tsx` | ✏️ modified | Mounted Header, set `dark` class, updated metadata |
| `src/app/page.tsx` | ✏️ modified | Replaced default with input + 3 tabs |
| `src/types/trace.ts` | ✨ new | Trace API types |
| `src/types/gasState.ts` | ✨ new | Gas + State API types |
| `src/types/security.ts` | ✨ new | Security API types |
| `src/types/global.d.ts` | ✨ new | `window.ethereum` ambient declaration |
| `src/lib/api.ts` | ✨ new | Mock-first API client (⭐ critical file) |
| `src/lib/format.ts` | ✨ new | Display helpers (truncate, formatNumber, formatGas) |
| `src/lib/constants.ts` | ✨ new | Sample tx hashes and contract addresses |
| `src/lib/wallet.ts` | ✨ new | ethers v6 wrapper |
| `src/hooks/useTrace.ts` | ✨ new | SWR hook for trace data |
| `src/hooks/useGasState.ts` | ✨ new | SWR hook for gas/state data |
| `src/hooks/useSecurity.ts` | ✨ new | SWR hook for security data |
| `src/mocks/trace_response.json` | ✨ new | Copy of mock_data/trace_response.json |
| `src/mocks/gas_state_response.json` | ✨ new | Copy of mock_data/gas_state_response.json |
| `src/mocks/security_response.json` | ✨ new | Copy of mock_data/security_response.json |
| `src/components/header/Header.tsx` | ✨ new | Top nav bar |
| `src/components/header/ConnectWalletButton.tsx` | ✨ new | Wallet button (stub) |
| `src/components/input/TxHashInput.tsx` | ✨ new | Search input (stub) |

**Total**: 22 hand-written/modified files + 11 auto-generated. **All present.**

---

## 4. Architecture — How the Pieces Connect

### 4.1 Module dependency graph

```
                          src/app/layout.tsx
                                 │
                                 ▼
                        ┌────────────────┐
                        │     Header      │
                        └────────┬───────┘
                                 │
                                 ▼
                       ConnectWalletButton (stub)
                                 │  later (Commit 15)
                                 ▼
                          (useWallet hook)
                                 │
                                 ▼
                            src/lib/wallet.ts
                                 │
                                 ▼
                          ethers v6 (BrowserProvider)
                                 │
                                 ▼
                            window.ethereum
                          (declared in global.d.ts)

  src/app/page.tsx
        │
        ├──> TxHashInput (stub)
        │       └── (later Commit 14: SAMPLE_TXS from src/lib/constants.ts)
        │
        └──> shadcn <Tabs>  ← three placeholders for now
                 │
                 ├─ Trace tab    (Commit 9: useTrace → src/lib/api.ts → src/mocks/trace_response.json)
                 ├─ Gas&State tab (Commit 12: useGasState → src/lib/api.ts → src/mocks/gas_state_response.json)
                 └─ Security tab  (Commit 13: useSecurity → src/lib/api.ts → src/mocks/security_response.json)
```

### 4.2 Data flow at runtime (when feature commits land)

```
User input (tx hash)
   │
   ▼
src/app/page.tsx           sets txHash state, passes to tab
   │
   ▼
src/components/{...}/Tab.tsx
   │
   ▼
src/hooks/useXxx.ts        SWR-managed cache + fetcher
   │
   ▼
src/lib/api.ts             decides: mock or real?
   │
   ├──── (USE_MOCKS=true) ──> src/mocks/*.json
   │
   └──── (USE_MOCKS=false) ──> fetch(API_BASE + "/api/...")
                                          │
                                          ▼
                                  Backend teammate's server
```

### 4.3 Why this layered structure

| Layer | Responsibility | Swap-out cost |
|---|---|---|
| **Types** (`src/types/`) | Source of truth for all data shapes | Trivial — just add fields |
| **Mocks** (`src/mocks/`) | Test data | Trivial — copy from `mock_data/` |
| **API client** (`src/lib/api.ts`) | Single switch point mock ↔ real | Low — one file, env-gated |
| **Hooks** (`src/hooks/`) | SWR caching + React integration | Low — same interface regardless of source |
| **Components** | Render hook output | Zero coupling to fetching — pure presentation |

This layering means: when the backend's real API lands on Day 4, **zero component files change**. We only flip one env var.

---

## 5. Dependencies — Every Package Explained

### 5.1 Runtime dependencies (`package.json` → `dependencies`)

| Package | Version | What it does | Where it's used in Phase 1 |
|---|---|---|---|
| `next` | ^16.2.6 | The framework | `src/app/`, build pipeline |
| `react` | ^19.2.4 | UI library | Every `.tsx` file |
| `react-dom` | ^19.2.4 | React DOM renderer | Bootstrap in `layout.tsx` |
| `ethers` | ^6.x | Ethereum library | `src/lib/wallet.ts`, `src/types/global.d.ts` |
| `recharts` | ^3.x | Chart components | Will be imported in Commit 10 (`GasBreakdownChart`); declared in `transpilePackages` now |
| `react-syntax-highlighter` | ^15.x | Solidity syntax coloring | Will be imported in Commit 13 (`CodeSnippetViewer`); declared in `transpilePackages` now |
| `swr` | ^2.x | Stale-while-revalidate data fetching | All 3 hooks in `src/hooks/` |
| `lucide-react` | latest | Icon set | Currently imported by shadcn primitives; we'll use it directly from Commit 7 |
| `tw-animate-css` | (transitive) | Animation utilities for shadcn | Pulled in by `shadcn init` |
| `@radix-ui/react-*` | various | Headless UI primitives | Underlying engines for shadcn's tabs/select/accordion/etc. |
| `class-variance-authority` | latest | Variant pattern for components | Used inside shadcn primitives |
| `clsx` + `tailwind-merge` | latest | className composition | `src/lib/utils.ts → cn()` |

### 5.2 Dev dependencies (`package.json` → `devDependencies`)

| Package | Version | What it does |
|---|---|---|
| `typescript` | ^5.x | TS compiler |
| `@types/node` | ^20.x | Node.js stdlib types |
| `@types/react` | ^19.x | React types |
| `@types/react-dom` | ^19.x | React DOM types |
| `@types/react-syntax-highlighter` | latest | Types for the syntax-highlighter package |
| `eslint` | ^9.x | Linter |
| `eslint-config-next` | ^16.x | Next.js-aware ESLint preset |
| `tailwindcss` | ^4.x | Tailwind compiler (CSS-based config) |
| `@tailwindcss/postcss` | ^4.x | PostCSS plugin for Tailwind v4 |

### 5.3 npm script reference

| Script | Command | When to use |
|---|---|---|
| `npm run dev` | `next dev` | Local development (Turbopack-backed) |
| `npm run build` | `next build` | Production build (CI / Vercel deploy) |
| `npm run start` | `next start` | Run the production build locally |
| `npm run lint` | `eslint` | Static analysis |

### 5.4 Total install size

After `npm install`, the `node_modules/` folder weighs approximately **400 MB** (354 + 73 + 1 = 428 packages). This is normal for a Next.js + shadcn project.

---

## 6. File-by-File Reference

For each file we authored, this section explains: **purpose**, **key exports**, and **dependency edges** (what it imports / what imports it).

### 6.1 `src/types/trace.ts`
- **Purpose**: TypeScript interfaces matching `mock_data/trace_response.json`.
- **Exports**: `CallType`, `TxStatus`, `CallNode`, `TraceResponse`.
- **Imports**: nothing.
- **Imported by**: `src/lib/api.ts`, `src/hooks/useTrace.ts`, future Trace components.

### 6.2 `src/types/gasState.ts`
- **Purpose**: TypeScript interfaces matching `mock_data/gas_state_response.json` (note: this single response combines gas profiling AND state diff).
- **Exports**: `GasBreakdownEntry`, `GasProfiling`, `BalanceChange`, `TokenTransfer`, `StateDiffs`, `GasStateResponse`.
- **Imports**: nothing.
- **Imported by**: `src/lib/api.ts`, `src/hooks/useGasState.ts`, future Gas/State components.

### 6.3 `src/types/security.ts`
- **Purpose**: TypeScript interfaces matching `mock_data/security_response.json`.
- **Exports**: `Severity`, `ScanStatus`, `Vulnerability`, `SecurityResponse`.
- **Imports**: nothing.
- **Imported by**: `src/lib/api.ts`, `src/hooks/useSecurity.ts`, future Security components.

### 6.4 `src/types/global.d.ts`
- **Purpose**: Ambient declaration so `window.ethereum` is typed.
- **Spec**: EIP-1193.
- **Exports**: nothing (augments `Window` globally).
- **Imports**: `Eip1193Provider` from `ethers`.
- **Imported by**: implicitly by `src/lib/wallet.ts` (via `window.ethereum`).

### 6.5 `src/lib/api.ts` ⭐ critical file
- **Purpose**: Single mock-vs-real fetch switch.
- **Behaviour**: if `NEXT_PUBLIC_USE_MOCKS !== "false"`, returns the JSON mocks after a 300ms simulated delay. Otherwise `fetch()`s from `NEXT_PUBLIC_API_BASE_URL`.
- **Exports**: `fetchTrace`, `fetchGasState`, `fetchSecurity`.
- **Imports**: 3 mock JSONs, 3 type files.
- **Imported by**: the 3 hooks.

### 6.6 `src/lib/format.ts`
- **Purpose**: Display helpers — pure, side-effect-free.
- **Exports**: `truncateAddress`, `formatNumber`, `formatGas`.
- **Imports**: nothing.
- **Imported by**: future components (CallTreeNode, TraceMetaCard, AddressDisplay).

### 6.7 `src/lib/constants.ts`
- **Purpose**: Hard-coded sample data for the dropdowns.
- **Exports**: `SAMPLE_TXS`, `SAMPLE_CONTRACTS`, `SampleTx` (type).
- **Imports**: nothing.
- **Imported by**: `TxHashInput` (in Commit 14), Security tab contract picker.

### 6.8 `src/lib/wallet.ts`
- **Purpose**: Wrap ethers v6 calls for MetaMask connect.
- **Exports**: `hasEthereum`, `getProvider`, `connectWallet`, `getNetworkName`.
- **Imports**: `BrowserProvider` from `ethers`.
- **Imported by**: `src/hooks/useWallet.ts` (Commit 15).

### 6.9 `src/hooks/useTrace.ts` / `useGasState.ts` / `useSecurity.ts`
- **Purpose**: SWR hooks that wrap each API client function.
- **Exports**: `useTrace`, `useGasState`, `useSecurity` respectively.
- **Imports**: `useSWR` from `swr`, the corresponding fetcher from `src/lib/api.ts`.
- **Imported by**: future tab components.

### 6.10 `src/mocks/*.json`
- **Purpose**: Frontend-local copies of the cross-team JSON contracts.
- **Source of truth**: `EVM-Analyzer-SC6107-main/mock_data/*.json`.
- **Important rule**: **do NOT edit these directly**. If the schema needs to change, change the originals in `mock_data/` and re-copy.

### 6.11 `src/app/layout.tsx`
- **Purpose**: Root layout — `<html>`, `<body>`, fonts, Header.
- **Imports**: `next/font/google` for Geist + Geist Mono, `./globals.css`, `Header`.
- **Key decision**: `dark` class on `<html>` to force shadcn dark theme.

### 6.12 `src/app/page.tsx`
- **Purpose**: The home (and only) page — input + 3 tabs.
- **Imports**: `Tabs*` from `@/components/ui/tabs`, `TxHashInput`.
- **Note**: marked `"use client"` because Radix `<Tabs>` uses React context.

### 6.13 `src/app/globals.css`
- **Purpose**: Tailwind v4 entry point and shadcn CSS variables.
- **Auto-generated** by `create-next-app` + extended by `shadcn init`.
- **Don't hand-edit** unless changing the colour theme.

### 6.14 `src/components/header/Header.tsx`
- **Purpose**: Static top nav bar.
- **Imports**: `ConnectWalletButton`.
- **Server component** (no `"use client"`) for fast initial paint.

### 6.15 `src/components/header/ConnectWalletButton.tsx`
- **Purpose**: Stub for the connect button. Commit 15 replaces with real logic.
- **Marked `"use client"`** so Commit 15's hook integration doesn't require touching the file structure again.

### 6.16 `src/components/input/TxHashInput.tsx`
- **Purpose**: Disabled placeholder input. Commit 14 replaces with real validation + dropdown.

### 6.17 `next.config.ts`
- **Purpose**: Declare `transpilePackages: ["recharts", "react-syntax-highlighter"]` so they bundle correctly. Added pre-emptively in Phase 1 to avoid surprises in Phase 3.

### 6.18 `.env.local` / `.env.example`
- **Purpose**: Env-var configuration. `.local` is git-ignored; `.example` is the committed template.
- **Currently set**: `NEXT_PUBLIC_USE_MOCKS=true`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

---

## 7. Known Issues & Workarounds

### 7.1 npm warnings about `D:\node js\node_global` and `node_cache`

**Symptom**: every npm command prints two yellow warnings:

```
npm warn Unknown user config "\node js\node_global" (prefixD:\node js\node_global)
npm warn Unknown user config "\node js\node_cache" (cacheD:\node js\node_cache)
```

**Cause**: legacy `~/.npmrc` entries pointing to an old Node install location.

**Impact**: cosmetic only. All commands work correctly.

**Fix when convenient**:
```powershell
npm config delete prefix
npm config delete cache
```

### 7.2 Nested git repo inside `frontend/`

**Symptom**: `frontend/.git/` exists, but project root has no `.git/`.

**Cause**: `create-next-app` auto-initialised a git repo because it didn't see one at the parent.

**Impact**: when the Architect/PM eventually runs `git init` at the project root, the frontend folder will appear as an embedded sub-repo (git submodule warning).

**Fix when Architect/PM does root init**:
```bash
rm -rf frontend/.git
cd <project-root>
git init -b main
git checkout -b feature/frontend-ui
git add frontend/
git commit -m "feat(frontend): scaffold Next.js + shadcn + types + app shell"
```

The recommended approach is to make the 5 Phase 1 commits manually using the messages from `docs/frontend-commits.md` for rubric-friendly granularity.

### 7.3 `next.config.ts` filename in Next.js 16

Earlier design docs assumed `next.config.mjs`. Next.js 16 generates **`next.config.ts`** for TypeScript projects. The contents are identical — only the extension differs.

### 7.4 Tailwind v4 has no `tailwind.config.ts`

Earlier design docs listed `tailwind.config.ts`. Tailwind 4 uses CSS-based theme tokens via `@theme inline` in `globals.css` instead of a JS config file. Nothing to fix — it just doesn't exist by design.

### 7.5 React Server Components and ethers

`window.ethereum` is undefined during SSR. `src/lib/wallet.ts` guards every call with `typeof window !== "undefined"` (in `hasEthereum()`) so importing it at module scope is safe. `src/hooks/useWallet.ts` (Commit 15) will additionally mark itself as `"use client"`.

---

## 8. Phase 1 Sign-off Checklist

```
[✓] All 22 hand-written files exist at their planned paths.
[✓] All 11 auto-generated files exist.
[✓] npx tsc --noEmit            exits 0
[✓] npm run lint                exits 0
[✓] npm run build               exits 0 — produces 4 static pages
[✓] npm run dev                 starts in <1s, no console errors
[✓] HTTP GET /                  returns 200 with all 8 expected strings
[✓] Dark mode active            (visible `dark` class on <html>)
[✓] All hand-written files have descriptive header comments citing
    design docs and explaining their role.
[✓] No npm audit critical or high findings (4 moderate are transitive
    and unrelated to our direct deps).
```

**Phase 1 is complete.** The codebase is a runnable scaffold with:
- 4 graphical regions ready to be filled (Trace, Gas&State, Security, Wallet button).
- 3 data-fetching hooks already plumbed to a mock-or-real switch.
- 3 fully-typed response shapes that match the locked inter-team schemas.

Next phase (Day 2) starts with `docs/frontend-commits.md` Commit 6: shared `LoadingState` / `ErrorState` / `EmptyState` components, then Commit 7's recursive `CallTreeNode`.

---

## Appendix A — Quick Reference: Run from Scratch

For a teammate who just cloned the repo and wants to run the frontend:

```bash
cd D:/NTU/SC6107/EVM-Analyzer-SC6107-main/frontend

# 1. Install deps (~3 minutes first time)
npm install

# 2. Copy env template
cp .env.example .env.local
# (no edits needed for Phase 1 — mocks work out of the box)

# 3. Run dev server
npm run dev
# → opens http://localhost:3000
```

Open the browser. You should see the header, the disabled input, and three tabs. Click between tabs to confirm they switch.

## Appendix B — File Counts at a Glance

```
frontend/
├── 7   config files (package.json, tsconfig.json, next.config.ts, ...)
├── 10  shadcn UI primitives (src/components/ui/)
├── 4   type definition files (src/types/)
├── 4   lib helpers (src/lib/api, format, constants, wallet)
├── 3   SWR hooks (src/hooks/)
├── 3   mock JSON files (src/mocks/)
├── 3   custom components (Header, ConnectWalletButton, TxHashInput)
├── 3   app files (layout.tsx, page.tsx, globals.css)
└── 1   utility (src/lib/utils.ts — shadcn's cn())
                                            = 38 files total under src/
```

End of document.
