# Phase 2 Testing Guide

> **Scope**: This document covers tests **specific to Phase 2** (the new Trace tab).
> For first-time environment setup, see [`frontend-testing.md`](./frontend-testing.md).
> **Time required**: ~5 minutes (assuming Phase 1 setup is already done).

If `npm install` has never been run, follow `frontend-testing.md` §2 first, then come back here.

---

## 0. Prerequisites

```powershell
# Verify Phase 1 still passes
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit         # expect: exit 0
npm run lint             # expect: exit 0
```

If either fails, **stop and fix Phase 1 first**. Phase 2 builds on top.

---

## 1. Static checks (must pass before any visual testing)

Run all three in order. Each must exit 0.

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit
npm run lint
npm run build
```

### Expected output

| Command | Last meaningful line | Exit code |
|---|---|---|
| `npx tsc --noEmit` | (no output beyond npm warnings) | 0 |
| `npm run lint` | `> eslint` then prompt returns | 0 |
| `npm run build` | `Route (app) ┌ ○ / └ ○ /_not-found` table | 0 |

`npm run build` should compile in **20–30 seconds** (Phase 1 was ~3s; the difference is the new component tree and SWR usage).

---

## 2. Runtime smoke test

```powershell
npm run dev
```

Wait for `✓ Ready in <Xms>` then open **http://localhost:3000** in your browser.

### 2.1 What you should see immediately (within 300ms of page load)

A skeleton loading state in the Trace tab — three grey shimmering bars inside a card. This is the `LoadingState` rendering while the mock fetcher resolves.

### 2.2 What you should see after ~300ms

The Trace tab populates with two stacked cards:

**Top — Transaction metadata** (`TraceMetaCard`):
- **Tx Hash**: `0x5c504ed4...22026` (long-truncation, click to copy)
- **Status**: green `Success` badge
- **Block #**: `19,840,211` (comma-grouped)
- **From → To**: `0xda9dfa...73cf` → `0x7a250d...488d`

**Bottom — Call tree** (`CallTreeNode`, recursive):
- **Root row**: ▼ `CALL` (blue) `swapExactETHForTokens(...)` `1.5 ETH` `125,000 gas`
- **Child 1**: `CALL` (blue) `deposit()` `1.5 ETH` `25,000 gas` (indented 24px)
- **Child 2**: `DELEGATECALL` (purple) `uniswapV3Swap(...)` `85,000 gas` (no value shown because backend sent "0 ETH")

The first two depth levels are auto-expanded.

### 2.3 Interactive checks

1. **Click the chevron next to the root row** → children collapse; click again → expand. The chevron rotates between ▶ and ▼.
2. **Click the truncated tx hash** in the metadata card → the Copy icon briefly becomes a green Check icon. Open a text editor and paste — you should see the full hash `0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026`.
3. **Hover any truncated address** → the browser tooltip shows the full address.
4. **Click the "Gas & State" or "Security" tab** → still shows "coming in Commit N" placeholder (Phase 3 / 4 work).

### 2.4 DevTools console check

Press **F12** → **Console** tab.

✅ Allowed:
- React DevTools / Fast Refresh info messages (black or gray)
- `[DEP0205] DeprecationWarning: module.register()` — Node 26 nagging Next.js internals, not our code
- "Slow filesystem detected" — informational only

❌ Not allowed:
- Any **red** error
- Any "Hydration mismatch" warnings
- Any "Each child in a list should have a unique 'key' prop" warnings

If you see a red error, screenshot the full message + DevTools console and send to the frontend engineer.

---

## 3. State-specific tests

### 3.1 LoadingState (already proven by §2.1)

The 300ms SWR delay is built into `src/lib/api.ts`. To make it visible for longer:

1. Open DevTools → **Network** tab → set throttling to "Slow 3G".
2. Hard refresh (Ctrl + Shift + R).
3. Skeleton bars are visible for ~1–2 seconds before the data appears.

Restore throttling to "Online" when done.

### 3.2 EmptyState

Temporarily nullify the default txHash in `src/app/page.tsx`:

```diff
- const [txHash] = useState<string | null>(SAMPLE_TXS[0]?.txHash ?? null);
+ const [txHash] = useState<string | null>(null);
```

Save → the dev server hot-reloads → Trace tab now shows the Inbox icon and "Enter a transaction hash to see its call trace."

**Roll back** before committing.

### 3.3 ErrorState

Temporarily force an error in `src/lib/api.ts`:

```diff
  export async function fetchTrace(txHash: string): Promise<TraceResponse> {
    if (USE_MOCKS) {
      await sleep(300);
+     throw new Error("Simulated fetch failure for testing");
      return traceMock as TraceResponse;
    }
    ...
```

Save → Trace tab now shows the red AlertCircle card with "Simulated fetch failure for testing" and a Retry button.

**Roll back** before committing.

### 3.4 Recursive depth guard

The depth guard kicks in at 50 levels. The Phase 2 sample data has only 2 levels of depth, so this can only be tested by editing the mock — left as an exercise. Code review of `src/components/trace/CallTreeNode.tsx` line ~36 is sufficient evidence the guard is in place.

---

## 4. Phase 2 sign-off checklist

```
Static checks
[ ] npx tsc --noEmit              exits 0
[ ] npm run lint                  exits 0
[ ] npm run build                 exits 0, 4 static pages

Runtime smoke (npm run dev → http://localhost:3000)
[ ] Phase 1 header still renders (⚙️ EVM Analyzer · SC6107 · Project 7)
[ ] Phase 1 tabs still switch on click
[ ] Trace tab shows skeleton briefly, then metadata + call tree
[ ] Metadata card shows: tx hash, green Success badge, block 19,840,211, from→to
[ ] Call tree shows root + 2 children, first 2 levels auto-expanded
[ ] Clicking chevron toggles expand/collapse on root
[ ] Clicking any address copies to clipboard (Copy icon → Check briefly)
[ ] Hover any address → full address tooltip
[ ] DevTools Console has no red errors
[ ] Gas & State and Security tabs still show "coming in Commit N"
```

13/13 boxes ticked = Phase 2 acceptance.

---

## 5. Common issues

### 5.1 "Click to copy" silently does nothing

`navigator.clipboard.writeText` requires a **secure context** (HTTPS) **or** localhost. Plain HTTP IP addresses (e.g. `http://192.168.1.5:3000`) will fail silently.

**Fix**: use `http://localhost:3000` (not the LAN IP printed by Next.js).

### 5.2 Trace tab shows "Request failed"

Three possible causes:
1. You're in the middle of the ErrorState test (§3.3) — roll back the change.
2. Mock JSON file got corrupted — restore from `mock_data/`:
   ```powershell
   copy ..\mock_data\trace_response.json src\mocks\trace_response.json
   ```
3. Schema drift — `src/types/trace.ts` no longer matches the mock. Re-run `npx tsc --noEmit` for a precise error.

### 5.3 The page is blank / white

Most likely a runtime error during render. Check DevTools → Console for the red traceback. Common culprits:
- A new component you added doesn't have `"use client"` but uses `useState`.
- An import path typo (`@/component/...` vs `@/components/...`).

### 5.4 Skeleton bars never disappear

SWR fetcher promise never resolves. Check `src/lib/api.ts` — has the `return` been accidentally removed inside the `if (USE_MOCKS)` block?

### 5.5 Hot-reload doesn't update the page

Hard refresh: Ctrl + Shift + R. If that doesn't work, kill `npm run dev` (Ctrl + C) and start it again.

---

## 6. What this document does NOT cover

- **MetaMask connect testing** — wallet integration arrives in Commit 15 (Phase 4).
- **Real backend testing** — the env switch flips in Commit 16. Until then, all data comes from `src/mocks/`.
- **Vercel deployment** — Commit 17.
- **Gas / Security tab testing** — Phase 3 will get its own `testing.md` update.

---

## Appendix — Quick re-test after a code change

If you've touched anything under `src/components/trace/` or `src/app/page.tsx`:

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit && npm run lint && npm run build && npm run dev
```

If all four succeed, refresh the browser and re-run §4's sign-off checklist.

---

# Phase 3 Testing (Day 3)

> Scope: Gas & State tab and Security tab (Commits 10–13).
> Pre-req: §0–§4 above (Phase 2 setup + Trace tab tests) still pass.

## P3.1 Static checks

Same three commands as Phase 2 — but rebuild is now longer (~7s the first time after a fresh install, faster on subsequent runs):

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit          # expect: exit 0
npm run lint              # expect: exit 0
npm run build             # expect: exit 0, 4 static pages
```

## P3.2 Gas & State tab — visual checks

`npm run dev` → http://localhost:3000 → click **Gas & State** tab.

### After ~300ms the page should show two columns:

**Left column:**
- **Total Gas Used card** with a Flame icon and the headline number `125,000` in large bold mono font.
- **Gas Breakdown by Function** card with a horizontal Recharts bar chart:
  - 3 bars, each a distinct color from the 5-color palette.
  - Y axis labels: `swapExactETHForTokens`, `WETH.deposit`, `UniswapV3Pool.swap`.
  - X axis 0–100% scale.
  - Hover any bar → tooltip shows `"{N}%"` and "Gas share".
- **Optimization Hint** card (yellow-tinted border, Lightbulb icon):
  - Title: "Optimization Hint" in yellow.
  - Body: the Chinese hint string from the mock (`发现高开销的 DELEGATECALL 操作...`).

**Right column:**
- **Balance Changes** table with one row:
  - Address: `0xda9dfa...73cf` (truncated, clickable)
  - Asset: `ETH`
  - Before: `10.0`
  - After: `8.498`
  - Δ: `-1.502` in **red** (because it's negative).
- **Token Transfers** table with one row:
  - Token: `USDC`
  - From / To: two truncated addresses
  - Amount: `4500.00`

### Responsive behavior
Resize the browser to <1024px wide → the two columns should collapse into a single stacked column (left column appears above right).

## P3.3 Security tab — visual checks

Click the **Security** tab.

### After ~300ms:

**SecuritySummary card:**
- Header: bold "VulnerableVault" + truncated contract address with copy icon
- Right side: green `Completed` badge
- Below: "Tools: Slither v0.10.0" + count line: `1 High · 1 Medium · 0 Low · 0 Info` (each number colored)

**Two vulnerability cards** (sorted High first):

1. **First card** (collapsed by default):
   - Red `High` badge
   - "Reentrancy" type label
   - "Line 42" muted text
   - "ERR-001" ID monospace on the right

2. **Second card**:
   - Orange `Medium` badge
   - "Access Control Bypass"
   - "Line 89"
   - "ERR-002"

### Click any vulnerability card to expand:
- Cards collapse/expand independently (clicking one doesn't close another).
- Expanded content shows the description paragraph (with the Chinese explanation).
- Below the description, a **syntax-highlighted Solidity code snippet** with:
  - Dark code background (`atomDark` theme).
  - Line numbers starting at the vulnerability's line (e.g. 42 for ERR-001).
  - Coloured keywords: `function`, `external`, `address(this).balance`, etc.

## P3.4 Trace tab — regression check

Click back to the **Trace** tab → confirm it still works exactly as it did in Phase 2 (metadata card + 3-node call tree). No regressions.

## P3.5 DevTools console check

F12 → Console → expected:
- ✅ No red errors.
- ✅ No "Hydration mismatch" warnings.
- ✅ No "Each child in a list should have a unique 'key' prop" warnings.
- Allowed: Fast Refresh info, deprecation warnings from Next.js internals.

## P3.6 State-specific tests for Phase 3

### Loading state
Throttle network in DevTools → Slow 3G → hard refresh (Ctrl+Shift+R) → switch between tabs. Skeleton bars should be visible for ~1–2 seconds before data appears in each tab.

### Empty state
Edit `src/app/page.tsx` temporarily — change both initial states to `null`:

```diff
- const [txHash] = useState<string | null>(SAMPLE_TXS[0]?.txHash ?? null);
- const [contractAddress] = useState<string | null>(SAMPLE_CONTRACTS[0]?.address ?? null);
+ const [txHash] = useState<string | null>(null);
+ const [contractAddress] = useState<string | null>(null);
```

Save → all three tabs show their EmptyState (with Inbox icon and the appropriate message). Roll back before committing.

### Error state
Edit `src/lib/api.ts` to throw in `fetchGasState` and `fetchSecurity` (similarly to the Phase 2 trick). All three tabs gracefully show the red ErrorState card with the Retry button. Roll back before committing.

## P3.7 Phase 3 sign-off checklist

```
Static checks
[ ] npx tsc --noEmit            exits 0
[ ] npm run lint                exits 0
[ ] npm run build               exits 0, 4 static pages

Runtime smoke (npm run dev → http://localhost:3000)
[ ] Trace tab still works (Phase 2 regression)
[ ] Gas & State tab loads — Total Gas Used, bar chart, hint, 2 tables
[ ] Bar chart shows 3 colored bars at correct percentages (12 / 20 / 68)
[ ] Δ column on Balance Changes shows "-1.502" in red
[ ] Security tab loads — Summary card with severity counts
[ ] Both vulnerability cards visible with correct severity badges
[ ] Clicking a vulnerability card expands; description + code visible
[ ] Code snippet has Solidity syntax highlighting and line numbers
[ ] Cards toggle independently (open one doesn't close another)
[ ] DevTools Console has no red errors
[ ] Switching between all 3 tabs is smooth, no flicker
```

11/11 boxes ticked = Phase 3 acceptance.

## P3.8 Common Phase 3 issues

### Bar chart shows nothing (blank area)
Recharts didn't load. Check:
1. `GasBreakdownChart.tsx` has `"use client"` at the top.
2. `next.config.ts` has `transpilePackages: ["recharts"]`.
3. DevTools Console for any "ReferenceError: window is not defined" — if present, the `"use client"` directive is missing.

### Code snippet has no colors
react-syntax-highlighter didn't load or the language is wrong. Check:
1. `CodeSnippetViewer.tsx` imports `Prism as SyntaxHighlighter` from the **Prism build** (not the light build).
2. Style import path is `react-syntax-highlighter/dist/esm/styles/prism`.
3. `next.config.ts` has `react-syntax-highlighter` in `transpilePackages`.

### Vulnerability card won't expand
Accordion is built on Base UI, not Radix. If you copy-pasted older Radix code (`type="single" collapsible`), TypeScript will reject it. The current shadcn API uses `value` on the `AccordionItem` and lets multi-open work by default.

### Δ column shows NaN or Infinity
The `Number()` parse failed. Check `mock_data/gas_state_response.json` — the `before` and `after` fields must be numeric strings (e.g. `"10.0"`, not `"10 ETH"`).

---

# Phase 4 Testing (Day 4)

> Scope: TxHashInput unlock (Commit 14), MetaMask wallet (Commit 15), live-API switch (Commit 16, doc-only), Vercel deploy (Commit 17, doc-only), root README (Commit 18).
> Pre-req: Phase 1+2+3 setup all done. MetaMask installed in a browser extension for the wallet tests.

## P4.1 Static checks

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit          # expect: exit 0
npm run lint              # expect: exit 0
npm run build             # expect: exit 0, 4 static pages
```

Build time: ~9s (similar to Phase 3 — no major increase).

## P4.2 TxHashInput — visual & interactive checks

`npm run dev` → http://localhost:3000.

The top of the page now shows a card with **two rows**, each with its own sample dropdown + manual input + Load button.

### P4.2.1 Transaction (Trace + Gas & State) row

- Label "TRANSACTION (TRACE + GAS & STATE)" in muted small caps.
- Sample dropdown shows "Uniswap V2 Swap — ETH → USDC swap with nested DELEGATECALL" pre-selected.
- Below the dropdown: a placeholder text input "...or paste a tx hash: 0x... (64 hex chars)" + disabled "Load" button.

**Tests:**
1. **Dropdown change**: open the dropdown. (Currently there's only one sample.) Picking it should keep tabs working.
2. **Manual invalid hash**: type `0xabc` in the text input → click Load. Expected: red error "Invalid tx hash — must be 0x followed by 64 hex characters." appears below the input. Tabs do NOT change.
3. **Manual valid hash**: paste a real 66-char hash like `0x1111111111111111111111111111111111111111111111111111111111111111` → click Load. Expected: error clears, the Trace tab attempts to fetch (will show an error since the mock JSON doesn't match — but that's the correct mock fallback behavior; with `USE_MOCKS=true` it still returns the canned data regardless).
4. **Enter-to-load**: type any valid hash → press Enter (don't click). Same effect as clicking Load.
5. **Empty draft**: clear the text input → Load button becomes disabled.
6. **Unchanged draft**: type the currently-loaded hash → Load button stays disabled (no point re-loading).

### P4.2.2 Contract Address (Security) row

Same behaviour as the tx hash row but with the `0x[40-hex]` regex.

**Tests:**
1. **Invalid address**: type `0xnotanaddress` → click Load → red error "Invalid address — must be 0x followed by 40 hex characters."
2. **Valid address**: paste `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` (USDC contract on mainnet) → click Load → Security tab refetches.

## P4.3 MetaMask wallet — interactive checks

Pre-req: MetaMask browser extension installed.

### P4.3.1 Wallet detection

- **With MetaMask installed**: Header right side shows a "Connect Wallet" button with Wallet icon.
- **Without MetaMask**: Header shows "Install MetaMask" button → clicking opens https://metamask.io/download/ in a new tab.

### P4.3.2 Connect flow

1. Click "Connect Wallet" → MetaMask popup appears.
2. Approve the connection in MetaMask.
3. Button transforms to: `🟢 0xabcd...EFGH · Sepolia` (or whatever network you're on).
4. Hover the connected button → LogOut icon fades in (subtle).
5. Open DevTools Console — should have no red errors.

### P4.3.3 Reactive updates

While connected, switch accounts inside MetaMask (extension popup → click account selector → choose a different one).
- Expected: the button's truncated address updates within ~1 second.

Switch networks (e.g., Sepolia → Ethereum Mainnet) via MetaMask's network switcher.
- Expected: the network name part of the button updates (`· Sepolia` → `· Ethereum`).

### P4.3.4 Disconnect

Click the connected button → state returns to "Connect Wallet".
- ⚠️ This is **client-side only**. MetaMask still remembers permission for this site. To fully revoke, the user must go to MetaMask → Connected sites → Disconnect.

### P4.3.5 Page reload persistence

Refresh the page (F5).
- Expected: the button immediately shows the connected state again — no MetaMask popup. This is `eth_accounts` (silent check) doing its job.

### P4.3.6 Reject flow

Click "Connect Wallet" → reject in the MetaMask popup.
- Expected: button returns to "Connect Wallet" + red error text below: "User rejected the request." (or similar MetaMask message).

## P4.4 Connection between TxHashInput and tabs

This is the integration sanity check:

1. **In the dropdown**, switch the contract sample (if more than one exists in `SAMPLE_CONTRACTS`).
2. Watch the Security tab — its data should refetch immediately.

In the current configuration there's only one sample contract, so this is more meaningful when the team adds more.

## P4.5 Documentation tests

### P4.5.1 Root README

```powershell
# In a fresh PowerShell window:
type README.md | Out-Host
```

Verify:
- [ ] Project title
- [ ] Live demo placeholder
- [ ] Quick Start section with 4-step setup
- [ ] Tech stack table
- [ ] Project structure
- [ ] Documentation index linking to all docs
- [ ] Team conventions (Chinese) preserved at the bottom

### P4.5.2 Deployment guide

Open `docs/deployment.md` and verify it covers:
- [ ] Live-backend env-flag switch
- [ ] Both Vercel deploy paths (dashboard + CLI)
- [ ] CORS guidance
- [ ] Rollback procedure
- [ ] Demo flow for the 5-minute presentation

## P4.6 Phase 4 sign-off checklist

```
Static checks
[ ] npx tsc --noEmit            exits 0
[ ] npm run lint                exits 0
[ ] npm run build               exits 0

Phase 1+2+3 regression (no breakage)
[ ] Trace tab still renders sample call tree
[ ] Gas & State tab still renders chart + tables
[ ] Security tab still renders vulnerability cards

Phase 4 new features
[ ] TxHashInput shows sample dropdowns + text inputs
[ ] Invalid hash → red error, Load disabled appropriately
[ ] Valid hash via Enter or Load → updates tabs
[ ] MetaMask "Install" link when no wallet detected
[ ] MetaMask "Connect Wallet" → popup → connected display
[ ] Connected display shows truncated address + network
[ ] accountsChanged in MetaMask → UI updates without reload
[ ] chainChanged in MetaMask → UI updates without reload
[ ] Page reload preserves connection (silent re-check)
[ ] Click connected button → disconnects (client-side)
[ ] DevTools console has no red errors

Docs
[ ] docs/changelog.md has Phase 4 entry at top
[ ] docs/testing.md has this Phase 4 section
[ ] docs/api_interfaces.md has useWallet + updated TxHashInput props
[ ] docs/deployment.md exists with Vercel + env-switch guide
[ ] Root README has project overview + quick start + doc index
```

15+ boxes ticked = Phase 4 acceptance.

## P4.7 Common Phase 4 issues

### MetaMask popup doesn't open

Browser blocked it. Look for the blocked-popup icon in the URL bar; click "Always allow popups from localhost:3000".

### "Install MetaMask" shows even though MetaMask is installed

Likely the extension is disabled or the browser hasn't injected `window.ethereum` yet. Refresh after MetaMask is unlocked.

### Address shows but network says "Chain N"

The chainId is mapped in `src/lib/wallet.ts` → `NETWORK_NAMES`. Add the chain ID you're on to that map to get a friendly name. Unknown chains fall back to `Chain <decimal id>`.

### "Hydration mismatch" warning related to the wallet button

Should NOT happen — `hasWallet` is gated inside `useEffect`. If it does appear, check that `useWallet.ts` still has the SSR-safety comment intact and isn't reading `window.ethereum` at module scope.

### Vercel build fails with "Module not found"

Root Directory in Vercel settings is wrong. It must be `frontend`, not the repo root.
