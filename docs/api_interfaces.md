# Frontend API & Interface Reference

> **Scope**: This document catalogs all *frontend-internal* APIs — TypeScript types, library function signatures, custom hooks, and component props.
> **For backend HTTP endpoints** (request/response wire format), see [`backend-api-spec.md`](./backend-api-spec.md).
> **Up-to-date as of**: end of Phase 2 (Trace tab complete; Gas & State / Security tabs pending).

This is the file an engineer reads to answer "what can I import, with what shape, from where?". Each entry is a contract — types and signatures here should not change silently.

---

## Table of Contents

1. [Type Definitions](#1-type-definitions)
2. [Library Function Signatures](#2-library-function-signatures)
3. [Custom Hook Signatures](#3-custom-hook-signatures)
4. [Component Prop Interfaces](#4-component-prop-interfaces)
5. [Module Dependency Graph](#5-module-dependency-graph)
6. [Frontend ↔ Backend Cross-Reference](#6-frontend--backend-cross-reference)

---

## 1. Type Definitions

All defined under `frontend/src/types/`. These must mirror `mock_data/*.json` exactly — see the iron rule in `README.md`.

### 1.1 `src/types/trace.ts` — Transaction Trace

```typescript
export type CallType = "CALL" | "DELEGATECALL" | "STATICCALL" | "CREATE";
export type TxStatus = "Success" | "Failed";

export interface CallNode {
  type: CallType;
  from: string;
  to: string;
  value: string;          // pre-formatted, e.g. "1.5 ETH"
  gasUsed: number;
  functionName: string;
  calls: CallNode[];      // recursive
}

export interface TraceResponse {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  status: TxStatus;
  traceTree: CallNode;
}
```

### 1.2 `src/types/gasState.ts` — Gas Profiling + State Diff

```typescript
export interface GasBreakdownEntry {
  function: string;
  gas: number;
  percentage: number;
}

export interface GasProfiling {
  totalGasUsed: number;
  breakdown: GasBreakdownEntry[];
  optimizationSuggestions: string;
}

export interface BalanceChange {
  address: string;
  asset: string;
  before: string;
  after: string;
}

export interface TokenTransfer {
  token: string;
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
}

export interface StateDiffs {
  balanceChanges: BalanceChange[];
  tokenTransfers: TokenTransfer[];
}

export interface GasStateResponse {
  txHash: string;
  gasProfiling: GasProfiling;
  stateDiffs: StateDiffs;
}
```

### 1.3 `src/types/security.ts` — Vulnerability Scan

**Phase 4.5 adaptation**: types loosened to match Position 3's CLI output. See `docs/adaptation-guide.md` §2.1 for rationale.

```typescript
export type Severity = "High" | "Medium" | "Low" | "Informational";

export type ScanStatus =
  | "Completed"
  | "CompletedWithNoFindings"   // ← added Phase 4.5
  | "Failed"
  | "Pending";

export interface Vulnerability {
  id: string;
  type: string;
  severity: Severity;
  line: number | null;           // ← can be null when Slither has no source mapping
  description: string;
  codeSnippet: string;
}

export interface SecurityResponse {
  contractAddress: string | null; // ← null when scanning a local file (no on-chain id)
  contractName: string;
  scanStatus: ScanStatus;
  toolsUsed: string[];
  vulnerabilities: Vulnerability[];
  error?: string;                 // ← present only when scanStatus === "Failed"
}
```

### 1.4 `src/types/global.d.ts` — Ambient declarations

Augments the global `Window` interface so `window.ethereum` is typed without `any`. Spec: EIP-1193.

```typescript
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
```

---

## 2. Library Function Signatures

### 2.1 `src/lib/api.ts` — Backend API client

The single mock-or-real switch (see `NEXT_PUBLIC_USE_MOCKS` env flag).

| Function | Signature | Throws |
|---|---|---|
| `fetchTrace` | `(txHash: string) => Promise<TraceResponse>` | `Error("Request failed (status): url")` on non-2xx |
| `fetchGasState` | `(txHash: string) => Promise<GasStateResponse>` | same as above |
| `fetchSecurity` | `(contractAddress: string) => Promise<SecurityResponse>` | same as above |

All three return mock JSON after a 300ms simulated delay when `NEXT_PUBLIC_USE_MOCKS !== "false"`.

### 2.2 `src/lib/format.ts` — Display helpers

| Function | Signature | Example |
|---|---|---|
| `truncateAddress` | `(addr: string, head?: number, tail?: number) => string` | `"0xda9dfa130df4..." → "0xda9d...73cf"` |
| `formatNumber` | `(n: number) => string` | `125000 → "125,000"` |
| `formatGas` | `(n: number) => string` | `125000 → "125,000 gas"` |

### 2.3 `src/lib/constants.ts` — Sample fixtures

| Export | Type | Purpose |
|---|---|---|
| `SampleTx` | interface | `{ label, txHash, description }` |
| `SAMPLE_TXS` | `SampleTx[]` | Demo transactions for the dropdown / page default state |
| `SAMPLE_CONTRACTS` | `{ label: string; address: string }[]` | Demo contracts for Security tab |

### 2.4 `src/lib/wallet.ts` — ethers v6 helpers

| Function | Signature | Notes |
|---|---|---|
| `hasEthereum` | `() => boolean` | Safe during SSR |
| `getProvider` | `() => BrowserProvider \| null` | Returns null when wallet missing |
| `connectWallet` | `() => Promise<{ address: string; chainId: number }>` | Triggers MetaMask popup; throws "MetaMask not installed" |
| `getNetworkName` | `(chainId: number) => string` | Falls back to `"Chain <id>"` for unknown chains |

### 2.5 `src/lib/utils.ts` — shadcn helper

| Function | Signature | Purpose |
|---|---|---|
| `cn` | `(...inputs: ClassValue[]) => string` | className merger (clsx + tailwind-merge) |

---

## 3. Custom Hook Signatures

All hooks under `src/hooks/` are thin SWR wrappers. They share the return shape `{ data, error, isLoading, mutate, isValidating }`.

### 3.0 `useWallet` (Phase 4)

```typescript
import { useWallet } from "@/hooks/useWallet";
const {
  address,          // string | null         — connected account
  chainId,          // number | null         — connected chain (decimal)
  isConnected,      // boolean               — derived from `!!address`
  isConnecting,     // boolean               — true while popup is open
  error,            // string | null         — last connection error
  connect,          // () => Promise<void>   — triggers MetaMask popup
  disconnect,       // () => void            — client-side only
  hasWallet,        // boolean               — true if window.ethereum exists
} = useWallet();
```

| Side effects | Detail |
|---|---|
| Subscribes to `accountsChanged` | UI updates when user swaps accounts inside MetaMask |
| Subscribes to `chainChanged` | UI updates when user switches networks |
| Cleanup on unmount | Listeners removed via `removeListener` |
| SSR-safe | `hasWallet` flag is set in useEffect to avoid hydration mismatch |

### 3.1 `useTrace`

```typescript
import { useTrace } from "@/hooks/useTrace";
// ...
const { data, error, isLoading, mutate } = useTrace(txHash);
//      ↑ TraceResponse | undefined
```

| Param | Type | Behaviour |
|---|---|---|
| `txHash` | `string \| null` | When null, no fetch happens (`data === undefined`) |

| Returned field | Type | Meaning |
|---|---|---|
| `data` | `TraceResponse \| undefined` | Defined only after a successful fetch |
| `error` | `Error \| undefined` | Last thrown error (from `fetchTrace`) |
| `isLoading` | `boolean` | True during the first fetch |
| `mutate` | `() => Promise<...>` | Force a re-fetch (used by Retry buttons) |

### 3.2 `useGasState`

Same shape as `useTrace` but returns `GasStateResponse`. SWR cache key: `["gasState", txHash]`. Not yet consumed by any UI (wired in Phase 3).

### 3.3 `useSecurity`

Same shape, returns `SecurityResponse`. SWR cache key: `["security", contractAddress]`. Not yet consumed by any UI (wired in Phase 3).

---

## 4. Component Prop Interfaces

### 4.1 Header (Phase 1 + Phase 4)

| Component | File | Props | Renders |
|---|---|---|---|
| `Header` | `header/Header.tsx` | (none) | Static brand + subtitle + `<ConnectWalletButton/>` |
| `ConnectWalletButton` | `header/ConnectWalletButton.tsx` | (none) | **Phase 4: full impl** — three states (Install / Connect / Connected) driven by `useWallet` |

### 4.2 Input (Phase 1 stub → Phase 4 full)

```typescript
// TxHashInput (Phase 4, replaces the Phase 1 stub)
interface TxHashInputProps {
  currentTxHash: string | null;                          // controlled value
  currentContract: string | null;                        // controlled value
  onTxHashChange: (txHash: string) => void;              // called on valid input
  onContractChange: (address: string) => void;           // called on valid input
}
```

Validation regexes (defined inline in the component):
- Tx hash: `^0x[a-fA-F0-9]{64}$`
- Address: `^0x[a-fA-F0-9]{40}$`

### 4.3 Shared primitives (Phase 2)

```typescript
// LoadingState
interface LoadingStateProps {
  rows?: number;     // default 3
}

// ErrorState
interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
}

// EmptyState
interface EmptyStateProps {
  message: string;
  icon?: ReactNode;  // default <Inbox/>
}

// AddressDisplay
interface AddressDisplayProps {
  address: string;
  length?: "short" | "long";  // default "short" → 6/4 truncation
}
```

### 4.4 Trace tab (Phase 2)

```typescript
// CallTypeBadge
interface CallTypeBadgeProps {
  type: CallType;
}

// CallTreeNode
interface CallTreeNodeProps {
  node: CallNode;
  depth: number;     // 0 for root; auto-expand when < 2; guard at 50
}

// TraceMetaCard
interface TraceMetaCardProps {
  data: TraceResponse;
}

// TraceTab
interface TraceTabProps {
  txHash: string | null;
}
```

### 4.5 shadcn/ui primitives (Phase 1, auto-generated)

These are off-limits for hand-editing. Their props match the upstream shadcn/ui definitions:

| Component | Source |
|---|---|
| `Button`, `Card`, `Tabs`, `Badge`, `Table`, `Input`, `Select`, `Accordion`, `Skeleton`, `Sonner` | `src/components/ui/*.tsx` |

Reference: https://ui.shadcn.com/docs/components

Note: in this Next.js 16 / latest shadcn install, the Accordion is built on **Base UI** (`@base-ui/react/accordion`), not Radix. Differences from older Radix Accordion:
- No `type="single" | "multiple"` prop on Root — multi-open by default.
- No `collapsible` prop — every item is collapsible.
- Control via `value` / `defaultValue` (arrays of open item values) instead.

Our `VulnerabilityCard` (§4.7) uses one Accordion Root per card to get independent toggle behavior.

### 4.6 Gas & State tab (Phase 3)

```typescript
// TotalGasCard
interface TotalGasCardProps {
  total: number;                    // raw gas units
}

// GasBreakdownChart  ⚠️ "use client"
interface GasBreakdownChartProps {
  entries: GasBreakdownEntry[];     // from gasProfiling.breakdown
}

// OptimizationHintsCard
interface OptimizationHintsCardProps {
  hint: string;                     // returns null if hint is empty
}

// BalanceChangesTable
interface BalanceChangesTableProps {
  rows: BalanceChange[];            // shows "No balance changes." if rows=[]
}

// TokenTransfersTable
interface TokenTransfersTableProps {
  rows: TokenTransfer[];            // shows "No token transfers." if rows=[]
}

// GasStateTab  ⚠️ "use client"
interface GasStateTabProps {
  txHash: string | null;            // null → renders <EmptyState/>
}
```

### 4.7 Security tab (Phase 3)

```typescript
// SeverityBadge
interface SeverityBadgeProps {
  severity: Severity;               // 4 color-coded variants
}

// CodeSnippetViewer  ⚠️ "use client"
interface CodeSnippetViewerProps {
  code: string;                     // raw Solidity source
  startLine?: number;               // default 1; pass vuln.line for accuracy
}

// SecuritySummary
interface SecuritySummaryProps {
  data: SecurityResponse;           // computes severity counts internally
}

// VulnerabilityCard  ⚠️ "use client"
interface VulnerabilityCardProps {
  vuln: Vulnerability;              // one card = one Accordion Root
}

// SecurityTab  ⚠️ "use client"
interface SecurityTabProps {
  contractAddress: string | null;   // null → renders <EmptyState/>
}
```

---

## 5. Module Dependency Graph

```
Phase 3 added the **double-marked** edges; *single-marked* edges are Phase 2; thin edges Phase 1.

src/app/page.tsx
   │
   ├── @/lib/constants ──── SAMPLE_TXS, ** SAMPLE_CONTRACTS **
   ├── @/components/ui/tabs
   ├── @/components/input/TxHashInput
   ├── * @/components/trace/TraceTab *
   ├── ** @/components/gas-state/GasStateTab **
   └── ** @/components/security/SecurityTab **

Phase 2 — Trace subtree (unchanged):
@/components/trace/TraceTab
   ├── @/hooks/useTrace ─── @/lib/api ─── @/mocks/trace_response.json
   ├── @/components/shared/{LoadingState,ErrorState,EmptyState,AddressDisplay}
   ├── @/components/trace/TraceMetaCard
   └── @/components/trace/CallTreeNode (recursive)
           ├── @/components/trace/CallTypeBadge
           └── lucide-react ─── ChevronRight, ChevronDown

** Phase 3 — Gas & State subtree: **
@/components/gas-state/GasStateTab
   ├── @/hooks/useGasState ─── @/lib/api ─── @/mocks/gas_state_response.json
   ├── @/components/shared/{LoadingState,ErrorState,EmptyState}
   ├── @/components/gas-state/TotalGasCard
   │       ├── @/lib/format ─── formatNumber
   │       └── lucide-react ─── Flame
   ├── @/components/gas-state/GasBreakdownChart  ("use client")
   │       └── recharts ─── BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis
   ├── @/components/gas-state/OptimizationHintsCard
   │       └── lucide-react ─── Lightbulb
   ├── @/components/gas-state/BalanceChangesTable
   │       └── @/components/shared/AddressDisplay
   └── @/components/gas-state/TokenTransfersTable
           └── @/components/shared/AddressDisplay

** Phase 3 — Security subtree: **
@/components/security/SecurityTab
   ├── @/hooks/useSecurity ─── @/lib/api ─── @/mocks/security_response.json
   ├── @/components/shared/{LoadingState,ErrorState,EmptyState}
   ├── lucide-react ─── ShieldCheck
   ├── @/components/security/SecuritySummary
   │       └── @/components/shared/AddressDisplay
   └── @/components/security/VulnerabilityCard  ("use client")
           ├── @/components/ui/accordion ─── (@base-ui/react/accordion)
           ├── @/components/security/SeverityBadge
           └── @/components/security/CodeSnippetViewer  ("use client")
                   └── react-syntax-highlighter ─── Prism, atomDark theme
```

Key observation (unchanged from Phase 2): **no upward edges from shared/ to feature folders**. Phase 3's two new feature trees both depend on Phase 2's shared primitives without modification.

Key observation: **no upward edges exist from shared/ to feature folders**. `shared/*` is a leaf module that anyone can depend on. This is why the same components can be reused by Phase 3's Gas/State and Security tabs without refactoring.

---

## 6. Frontend ↔ Backend Cross-Reference

Each frontend type maps to exactly one backend endpoint:

| Frontend type (`src/types/`) | Used by hook | Calls fetcher | Backend endpoint (when `USE_MOCKS=false`) | Backend spec section |
|---|---|---|---|---|
| `TraceResponse` | `useTrace` | `fetchTrace` | `GET /api/trace/:txHash` | [backend-api-spec.md §2](./backend-api-spec.md#2-接口-1get-apitracetxhash) |
| `GasStateResponse` | `useGasState` | `fetchGasState` | `GET /api/gas-state/:txHash` | [backend-api-spec.md §3](./backend-api-spec.md#3-接口-2get-apigas-statetxhash) |
| `SecurityResponse` | `useSecurity` | `fetchSecurity` | `GET /api/security/:address` | [backend-api-spec.md §4](./backend-api-spec.md#4-接口-3get-apisecurityaddress) |

When the backend lands on Day 4, only `.env.local` changes (`NEXT_PUBLIC_USE_MOCKS=false`). No code under `src/` needs to change because the hooks and fetchers are typed against the locked schemas.

---

## Appendix — Adding a new endpoint (future reference)

If a future phase needs a new backend endpoint, follow this template:

1. **Backend team** writes the schema in `mock_data/<feature>_response.json` and adds a section to `docs/backend-api-spec.md`.
2. **Frontend engineer** mirrors the schema in `src/types/<feature>.ts`.
3. Copy the mock JSON to `src/mocks/`.
4. Add a fetcher to `src/lib/api.ts` following the mock-or-real pattern.
5. Add a hook in `src/hooks/use<Feature>.ts` (1:1 with `useTrace`).
6. Document the new types, signatures, and props **in this file**.

Keeping all three (mock JSON, type file, this doc) in lockstep is what makes the integration switch on Day 4 a one-line change rather than a debugging session.
