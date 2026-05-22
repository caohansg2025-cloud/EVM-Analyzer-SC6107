# Frontend Functional Design Document

> **Project**: EVM Transaction Debugger & Analyzer (SC6107 Project 7)
> **Role**: Web3 Frontend Engineer (Role #4)
> **Scope**: Single Page Application — visualizes Call Tree, Gas Profiling + State Diff, and Vulnerability Scan results
> **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · ethers.js v6 · Recharts · SWR

## 1. Goals & Non-goals

### Goals
1. Render three views (Trace / Gas & State / Security) consuming the locked schemas in `mock_data/`.
2. Connect to MetaMask via ethers.js v6 (display address, network).
3. Allow the user to input a tx hash or pick from a dropdown of 5 sample txs.
4. Switch from mock data to real backend APIs via a single env flag — zero code change.
5. Look professional enough to maximize the UI/UX 10% rubric weight.

### Non-goals (explicitly cut)
- Signing transactions / writing to chain — display only.
- Mobile responsive — desktop only.
- Internationalization — English-only.
- Dark/light mode toggle — pick one theme (dark) and stick with it.
- Saving history — no localStorage, no DB.
- WalletConnect — MetaMask only.
- Pagination of vulnerabilities — assume small lists (<50 items).

---

## 2. Architecture Overview

### Data flow
```
┌──────────────────────────────────────────────────────────────┐
│  User input (tx hash / contract address / sample dropdown)   │
└─────────────┬────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│  React component (tab panel)                                 │
│  ─ calls a custom hook (useTrace / useGasState / useSecurity)│
└─────────────┬────────────────────────────────────────────────┘
              │  SWR fetcher
              ▼
┌──────────────────────────────────────────────────────────────┐
│  src/lib/api.ts                                              │
│  ─ if NEXT_PUBLIC_USE_MOCKS=true → returns local JSON        │
│  ─ if false → fetch(/api/trace/:tx)                          │
└─────────────┬────────────────────────────────────────────────┘
              │
       ┌──────┴─────┐
       ▼            ▼
   mock JSON   Backend API
   (Day 1-3)   (Day 4)
```

### Component dependency graph
```
app/layout.tsx
  └── Header
       └── ConnectWalletButton ← useWallet
app/page.tsx
  ├── TxHashInput
  └── Tabs
       ├── TraceTab           ← useTrace
       │   ├── TraceMetaCard
       │   └── CallTreeNode (recursive)
       │       └── CallTypeBadge
       ├── GasStateTab        ← useGasState
       │   ├── TotalGasCard
       │   ├── GasBreakdownChart
       │   ├── OptimizationHintsCard
       │   ├── BalanceChangesTable
       │   └── TokenTransfersTable
       └── SecurityTab        ← useSecurity
           ├── SecuritySummary
           └── VulnerabilityCard (list)
               ├── SeverityBadge
               └── CodeSnippetViewer
```

---

## 3. Full File Tree

All paths relative to `EVM-Analyzer-SC6107-main/frontend/`.

```
frontend/
├── package.json                                 
├── tsconfig.json                                  
├── tailwind.config.ts                           
├── postcss.config.js                             
├── next.config.mjs                                 
├── components.json                                
├── .env.local                                   
├── .env.example                                  
├── .eslintrc.json                                  
├── .gitignore                                     
├── README.md                                      
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx                           
    │   ├── page.tsx                                
    │   └── globals.css                             
    ├── components/
    │   ├── ui/                                     
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── tabs.tsx
    │   │   ├── badge.tsx
    │   │   ├── table.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── accordion.tsx
    │   │   ├── skeleton.tsx
    │   │   └── sonner.tsx
    │   ├── header/
    │   │   ├── Header.tsx                          
    │   │   └── ConnectWalletButton.tsx            
    │   ├── input/
    │   │   └── TxHashInput.tsx                    
    │   ├── trace/
    │   │   ├── TraceTab.tsx                      
    │   │   ├── TraceMetaCard.tsx                  
    │   │   ├── CallTreeNode.tsx                    
    │   │   └── CallTypeBadge.tsx                  
    │   ├── gas-state/
    │   │   ├── GasStateTab.tsx                    
    │   │   ├── TotalGasCard.tsx                   
    │   │   ├── GasBreakdownChart.tsx             
    │   │   ├── OptimizationHintsCard.tsx           
    │   │   ├── BalanceChangesTable.tsx            
    │   │   └── TokenTransfersTable.tsx            
    │   ├── security/
    │   │   ├── SecurityTab.tsx                   
    │   │   ├── SecuritySummary.tsx                
    │   │   ├── VulnerabilityCard.tsx              
    │   │   ├── SeverityBadge.tsx                 
    │   │   └── CodeSnippetViewer.tsx            
    │   └── shared/
    │       ├── LoadingState.tsx                    
    │       ├── ErrorState.tsx                      
    │       ├── EmptyState.tsx                      
    │       └── AddressDisplay.tsx                 
    ├── hooks/
    │   ├── useWallet.ts                           
    │   ├── useTrace.ts                           
    │   ├── useGasState.ts                         
    │   └── useSecurity.ts                         
    ├── lib/
    │   ├── api.ts                                 
    │   ├── wallet.ts                               
    │   ├── format.ts                             
    │   ├── constants.ts                           
    │   └── utils.ts                              
    ├── types/
    │   ├── trace.ts                              
    │   ├── gasState.ts                            
    │   ├── security.ts                             
    │   └── global.d.ts                             
    └── mocks/
        ├── trace_response.json                     [copy from /mock_data]
        ├── gas_state_response.json                 [copy from /mock_data]
        └── security_response.json                  [copy from /mock_data]
```

---

## 4. Configuration Files

### 4.1 `package.json`
**Purpose**: Declare dependencies and npm scripts.

**Dependencies to install** (run after `create-next-app`):
```bash
npm install ethers@6 recharts react-syntax-highlighter swr lucide-react
npm install -D @types/react-syntax-highlighter
```

**Scripts** (`scripts` section):
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

### 4.2 `tsconfig.json`
**Purpose**: TypeScript compiler options.
**Special**: Ensure `"paths": { "@/*": ["./src/*"] }` so imports like `@/lib/api` work.

### 4.3 `tailwind.config.ts`
**Purpose**: Tailwind config — auto-extended by shadcn's `init`.
**Special**: shadcn adds `darkMode: ["class"]` and CSS variable theming. Don't modify unless needed.

### 4.4 `next.config.mjs`
**Purpose**: Next.js configuration.
**Content**:
```javascript
const nextConfig = {
  reactStrictMode: true,
  // Recharts/react-syntax-highlighter need this to avoid SSR issues
  transpilePackages: ["recharts", "react-syntax-highlighter"],
};
export default nextConfig;
```

### 4.5 `components.json`
**Purpose**: shadcn/ui configuration (generated by `npx shadcn@latest init`).
**Style**: `default`, **base color**: `slate`, **CSS variables**: `true`.

### 4.6 `.env.local`
**Purpose**: Local environment variables. NOT committed to git.
**Content**:
```
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 4.7 `.env.example`
**Purpose**: Template for `.env.local` — committed to git for teammates.
**Content**:
```
NEXT_PUBLIC_USE_MOCKS=true        # set to "false" to call real backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## 5. Type Definitions (`src/types/`)

These mirror the JSON schemas in `mock_data/` exactly. The "iron rule" is enforced here.

### 5.1 `src/types/trace.ts`
```typescript
export type CallType = "CALL" | "DELEGATECALL" | "STATICCALL" | "CREATE";

export type TxStatus = "Success" | "Failed";

export interface CallNode {
  type: CallType;
  from: string;
  to: string;
  value: string;          // backend-formatted: "1.5 ETH", "0 ETH"
  gasUsed: number;
  functionName: string;   // e.g. "swapExactETHForTokens(uint256,address[],address,uint256)"
  calls: CallNode[];      // recursive nested children
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

### 5.2 `src/types/gasState.ts`
```typescript
export interface GasBreakdownEntry {
  function: string;       // function name as label
  gas: number;            // gas units
  percentage: number;     // 0–100
}

export interface GasProfiling {
  totalGasUsed: number;
  breakdown: GasBreakdownEntry[];
  optimizationSuggestions: string;  // free-text advice
}

export interface BalanceChange {
  address: string;
  asset: string;          // "ETH", "USDC", etc.
  before: string;         // backend-formatted: "10.0"
  after: string;          // backend-formatted: "8.498"
}

export interface TokenTransfer {
  token: string;          // symbol "USDC"
  from: string;
  to: string;
  amount: string;         // backend-formatted: "4500.00"
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

### 5.3 `src/types/security.ts`
```typescript
export type Severity = "High" | "Medium" | "Low" | "Informational";

export type ScanStatus = "Completed" | "Failed" | "Pending";

export interface Vulnerability {
  id: string;             // e.g. "ERR-001"
  type: string;           // e.g. "Reentrancy", "Integer Overflow"
  severity: Severity;
  line: number;
  description: string;
  codeSnippet: string;    // already-extracted Solidity excerpt
}

export interface SecurityResponse {
  contractAddress: string;
  scanStatus: ScanStatus;
  toolsUsed: string[];    // e.g. ["Slither v0.10.0"]
  vulnerabilities: Vulnerability[];
}
```

### 5.4 `src/types/global.d.ts`
**Purpose**: Declare `window.ethereum` so TypeScript doesn't complain.
```typescript
import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
export {};
```

---

## 6. Library Code (`src/lib/`)

### 6.1 `src/lib/api.ts` ⭐ **Most important file**
**Purpose**: Single switch point between mock data and real backend. Day 4 integration flips one env var.

**Exports**:
- `fetchTrace(txHash: string): Promise<TraceResponse>`
- `fetchGasState(txHash: string): Promise<GasStateResponse>`
- `fetchSecurity(contractAddress: string): Promise<SecurityResponse>`

**Full implementation**:
```typescript
import traceMock from "@/mocks/trace_response.json";
import gasStateMock from "@/mocks/gas_state_response.json";
import securityMock from "@/mocks/security_response.json";
import type { TraceResponse } from "@/types/trace";
import type { GasStateResponse } from "@/types/gasState";
import type { SecurityResponse } from "@/types/security";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchTrace(txHash: string): Promise<TraceResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return traceMock as TraceResponse;
  }
  return getJson<TraceResponse>(`${API_BASE}/api/trace/${txHash}`);
}

export async function fetchGasState(txHash: string): Promise<GasStateResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return gasStateMock as GasStateResponse;
  }
  return getJson<GasStateResponse>(`${API_BASE}/api/gas-state/${txHash}`);
}

export async function fetchSecurity(contractAddress: string): Promise<SecurityResponse> {
  if (USE_MOCKS) {
    await sleep(300);
    return securityMock as SecurityResponse;
  }
  return getJson<SecurityResponse>(`${API_BASE}/api/security/${contractAddress}`);
}
```

### 6.2 `src/lib/wallet.ts`
**Purpose**: ethers.js v6 helpers, isolated from React.

**Exports**:
- `getProvider(): BrowserProvider | null` — returns provider or null if MetaMask absent
- `connectWallet(): Promise<{ address: string; chainId: number }>` — requests account access
- `getNetworkName(chainId: number): string` — maps chainId to readable name

**Implementation outline**:
```typescript
import { BrowserProvider } from "ethers";

export function hasEthereum(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function getProvider(): BrowserProvider | null {
  if (!hasEthereum()) return null;
  return new BrowserProvider(window.ethereum!);
}

export async function connectWallet() {
  const provider = getProvider();
  if (!provider) throw new Error("MetaMask not installed");
  const accounts = await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  return { address: accounts[0] as string, chainId: Number(network.chainId) };
}

const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia",
  17000: "Holesky",
  137: "Polygon",
};
export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId] ?? `Chain ${chainId}`;
}
```

### 6.3 `src/lib/format.ts`
**Purpose**: Display formatters. No business logic.

**Exports**:
- `truncateAddress(addr: string, head=6, tail=4): string` → "0xda9dfa...dE94"
- `formatNumber(n: number): string` → "125,000"
- `formatGas(n: number): string` → "125,000 gas"

```typescript
export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
export function formatGas(n: number): string {
  return `${formatNumber(n)} gas`;
}
```

### 6.4 `src/lib/constants.ts`
**Purpose**: Hard-coded sample tx hashes for the dropdown. **Coordinate with backend team — these must match `fixtures/demo-txs.json`**.

```typescript
export interface SampleTx {
  label: string;
  txHash: string;
  description: string;
}

export const SAMPLE_TXS: SampleTx[] = [
  { label: "Uniswap V2 Swap", txHash: "0x5c504ed...22026", description: "ETH → USDC swap, complex call tree" },
  { label: "USDC Transfer",    txHash: "0x...",            description: "Simple ERC-20 transfer" },
  { label: "Known Exploit",    txHash: "0x...",            description: "Reentrancy attack tx" },
  { label: "Failed Tx",        txHash: "0x...",            description: "Reverted transaction" },
  { label: "NFT Mint",         txHash: "0x...",            description: "ERC-721 mint" },
];

export const SAMPLE_CONTRACTS: { label: string; address: string }[] = [
  { label: "Vulnerable: Reentrancy",       address: "0x...local..." },
  { label: "Vulnerable: Integer Overflow", address: "0x...local..." },
];
```

### 6.5 `src/lib/utils.ts`
**Purpose**: shadcn's `cn()` utility (auto-generated by `npx shadcn init`).
**Content**:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 7. Hooks (`src/hooks/`)

All data-fetching hooks use SWR for built-in loading/error/revalidation.

### 7.1 `src/hooks/useWallet.ts`
**Purpose**: MetaMask state management — connected address, chain, connect/disconnect actions.

**Return shape**:
```typescript
{
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

**Implementation notes**:
- On mount: check if MetaMask already authorized; auto-fetch the current account.
- Listen to `accountsChanged` and `chainChanged` events on `window.ethereum`.
- On unmount: remove event listeners.
- Wrap all `window.ethereum` access in `typeof window !== "undefined"` guard for SSR safety.
- Mark file with `"use client"` at top.

### 7.2 `src/hooks/useTrace.ts`
```typescript
"use client";
import useSWR from "swr";
import { fetchTrace } from "@/lib/api";

export function useTrace(txHash: string | null) {
  return useSWR(
    txHash ? ["trace", txHash] : null,
    ([, h]) => fetchTrace(h),
    { revalidateOnFocus: false }
  );
}
```

### 7.3 `src/hooks/useGasState.ts`
Same pattern as `useTrace`, calls `fetchGasState`. Key: `["gasState", txHash]`.

### 7.4 `src/hooks/useSecurity.ts`
Same pattern, calls `fetchSecurity`. Key: `["security", contractAddress]`.

---

## 8. Mock Data (`src/mocks/`)

### Strategy
- **Copy** (do not symlink, do not modify) the three JSON files from `EVM-Analyzer-SC6107-main/mock_data/` into `frontend/src/mocks/`.
- Treat the originals in `mock_data/` as the **inter-team contract**. If the schema must change, raise it with the whole team — don't unilaterally edit.
- TypeScript imports JSON natively in Next.js. No special loader needed.

### Files
- `src/mocks/trace_response.json`
- `src/mocks/gas_state_response.json`
- `src/mocks/security_response.json`

---

## 9. App Pages (`src/app/`)

### 9.1 `src/app/globals.css`
**Purpose**: Tailwind base + shadcn CSS variables (auto-generated by `shadcn init`).
**Content**: Keep the auto-generated content. Don't override theme colors unless needed.

### 9.2 `src/app/layout.tsx`
**Purpose**: Root HTML shell, mounts Header, sets dark theme by default.

```tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { Header } from "@/components/header/Header";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EVM Transaction Debugger & Analyzer",
  description: "SC6107 Project 7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
```

### 9.3 `src/app/page.tsx`
**Purpose**: Main page — search input + three tabs.

```tsx
"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TxHashInput } from "@/components/input/TxHashInput";
import { TraceTab } from "@/components/trace/TraceTab";
import { GasStateTab } from "@/components/gas-state/GasStateTab";
import { SecurityTab } from "@/components/security/SecurityTab";

export default function HomePage() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractAddr, setContractAddr] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <TxHashInput onTxHashChange={setTxHash} onContractChange={setContractAddr} />
      <Tabs defaultValue="trace" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="gas-state">Gas & State</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="trace"><TraceTab txHash={txHash} /></TabsContent>
        <TabsContent value="gas-state"><GasStateTab txHash={txHash} /></TabsContent>
        <TabsContent value="security"><SecurityTab contractAddress={contractAddr} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 10. Components

### 10.1 Header components

#### `src/components/header/Header.tsx`
**Purpose**: Top navigation bar with logo + wallet connect.

```tsx
import { ConnectWalletButton } from "./ConnectWalletButton";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">⚙️ EVM Analyzer</span>
          <span className="text-xs text-muted-foreground hidden md:inline">SC6107 · Project 7</span>
        </div>
        <ConnectWalletButton />
      </div>
    </header>
  );
}
```

#### `src/components/header/ConnectWalletButton.tsx`
**Purpose**: Button that triggers MetaMask connect and shows state.

**Behavior**:
- If `!isConnected` → "Connect Wallet" button → calls `connect()`.
- If `isConnecting` → disabled button "Connecting..."
- If `isConnected` → shows `<address truncated> · <network>` with a dropdown (or just a "Disconnect" button).
- If MetaMask not installed → button text "Install MetaMask", links to https://metamask.io/.

**Implementation**: client component, uses `useWallet()`. Use shadcn `<Button>` for styling.

### 10.2 Input component

#### `src/components/input/TxHashInput.tsx`
**Purpose**: Lets user pick a sample or paste their own tx hash / contract address.

**Props**:
```typescript
interface Props {
  onTxHashChange: (txHash: string | null) => void;
  onContractChange: (address: string | null) => void;
}
```

**UI**:
- shadcn `<Select>` dropdown labeled "Sample Transactions" — options from `SAMPLE_TXS`.
- shadcn `<Input>` for manual tx hash entry.
- shadcn `<Input>` for contract address (for the Security tab).
- A "Load" button that validates and calls the callbacks.

**Validation**:
- tx hash: must match `/^0x[a-fA-F0-9]{64}$/`.
- address: must match `/^0x[a-fA-F0-9]{40}$/`.
- Show inline red error text if invalid. Don't call callback on invalid input.

### 10.3 Trace components

#### `src/components/trace/TraceTab.tsx`
**Purpose**: Wires data hook + meta card + recursive tree.

```tsx
"use client";
import { useTrace } from "@/hooks/useTrace";
import { TraceMetaCard } from "./TraceMetaCard";
import { CallTreeNode } from "./CallTreeNode";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export function TraceTab({ txHash }: { txHash: string | null }) {
  const { data, error, isLoading } = useTrace(txHash);

  if (!txHash) return <EmptyState message="Enter a transaction hash to see its trace." />;
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <TraceMetaCard data={data} />
      <CallTreeNode node={data.traceTree} depth={0} />
    </div>
  );
}
```

#### `src/components/trace/TraceMetaCard.tsx`
**Purpose**: Shows top-level metadata of the transaction.

**UI**: shadcn `<Card>` with a 4-cell grid:
- **Tx Hash**: truncated, with copy-to-clipboard icon.
- **Status**: green "Success" or red "Failed" badge.
- **Block #**: formatted number.
- **From → To**: two truncated addresses with arrow.

#### `src/components/trace/CallTreeNode.tsx` ⭐ **Hardest component**
**Purpose**: Recursive node rendering one call frame. Expand/collapse children.

```tsx
"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { CallTypeBadge } from "./CallTypeBadge";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { formatGas } from "@/lib/format";
import type { CallNode } from "@/types/trace";

const MAX_DEPTH = 50;

interface Props {
  node: CallNode;
  depth: number;
}

export function CallTreeNode({ node, depth }: Props) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);  // auto-expand first 2 levels

  if (depth > MAX_DEPTH) return <div className="text-xs text-muted-foreground">...max depth reached</div>;

  const hasChildren = node.calls && node.calls.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-accent/50 rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(v => !v)}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="w-4 h-4" />
        )}
        <CallTypeBadge type={node.type} />
        <code className="text-sm font-mono truncate flex-1">{node.functionName}</code>
        <span className="text-xs text-muted-foreground">{formatGas(node.gasUsed)}</span>
        {node.value !== "0 ETH" && <span className="text-xs text-yellow-500">{node.value}</span>}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.calls.map((child, i) => (
            <CallTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### `src/components/trace/CallTypeBadge.tsx`
**Purpose**: Color-coded badge for the call type.

```tsx
import { Badge } from "@/components/ui/badge";
import type { CallType } from "@/types/trace";

const COLOR_MAP: Record<CallType, string> = {
  CALL:         "bg-blue-600 hover:bg-blue-600",
  DELEGATECALL: "bg-purple-600 hover:bg-purple-600",
  STATICCALL:   "bg-gray-500 hover:bg-gray-500",
  CREATE:       "bg-green-600 hover:bg-green-600",
};

export function CallTypeBadge({ type }: { type: CallType }) {
  return <Badge className={`${COLOR_MAP[type]} text-white text-xs`}>{type}</Badge>;
}
```

### 10.4 Gas & State components

#### `src/components/gas-state/GasStateTab.tsx`
**Purpose**: Wires data hook and composes the sub-components.

```tsx
"use client";
import { useGasState } from "@/hooks/useGasState";
import { TotalGasCard } from "./TotalGasCard";
import { GasBreakdownChart } from "./GasBreakdownChart";
import { OptimizationHintsCard } from "./OptimizationHintsCard";
import { BalanceChangesTable } from "./BalanceChangesTable";
import { TokenTransfersTable } from "./TokenTransfersTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export function GasStateTab({ txHash }: { txHash: string | null }) {
  const { data, error, isLoading } = useGasState(txHash);

  if (!txHash) return <EmptyState message="Enter a transaction hash to see gas and state changes." />;
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <TotalGasCard total={data.gasProfiling.totalGasUsed} />
        <GasBreakdownChart entries={data.gasProfiling.breakdown} />
        <OptimizationHintsCard hint={data.gasProfiling.optimizationSuggestions} />
      </div>
      <div className="space-y-4">
        <BalanceChangesTable rows={data.stateDiffs.balanceChanges} />
        <TokenTransfersTable rows={data.stateDiffs.tokenTransfers} />
      </div>
    </div>
  );
}
```

#### `src/components/gas-state/TotalGasCard.tsx`
**Purpose**: A big number displaying total gas used.
**UI**: shadcn `<Card>` with `<CardTitle>Total Gas Used</CardTitle>` and a 2xl bold number.

#### `src/components/gas-state/GasBreakdownChart.tsx` ⭐ **Needs `"use client"`**
**Purpose**: Horizontal bar chart of gas consumption by function.

```tsx
"use client";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GasBreakdownEntry } from "@/types/gasState";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export function GasBreakdownChart({ entries }: { entries: GasBreakdownEntry[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Gas Breakdown</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, entries.length * 40)}>
          <BarChart data={entries} layout="vertical" margin={{ left: 100 }}>
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="function" width={150} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="percentage">
              {entries.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### `src/components/gas-state/OptimizationHintsCard.tsx`
**UI**: shadcn `<Card>`, yellow-tinted border (`border-yellow-500/30`), `<CardTitle>` with lightbulb icon, content = `hint` string.

#### `src/components/gas-state/BalanceChangesTable.tsx`
**UI**: shadcn `<Table>` with columns: Address (truncated), Asset, Before, After, Δ (computed from before–after).

#### `src/components/gas-state/TokenTransfersTable.tsx`
**UI**: shadcn `<Table>` with columns: Token, From, To, Amount.

### 10.5 Security components

#### `src/components/security/SecurityTab.tsx`
```tsx
"use client";
import { useSecurity } from "@/hooks/useSecurity";
import { SecuritySummary } from "./SecuritySummary";
import { VulnerabilityCard } from "./VulnerabilityCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export function SecurityTab({ contractAddress }: { contractAddress: string | null }) {
  const { data, error, isLoading } = useSecurity(contractAddress);

  if (!contractAddress) return <EmptyState message="Enter a contract address to scan for vulnerabilities." />;
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <SecuritySummary data={data} />
      {data.vulnerabilities.length === 0 ? (
        <EmptyState message="✅ No vulnerabilities detected." />
      ) : (
        <div className="space-y-2">
          {data.vulnerabilities.map(v => <VulnerabilityCard key={v.id} vuln={v} />)}
        </div>
      )}
    </div>
  );
}
```

#### `src/components/security/SecuritySummary.tsx`
**UI**: Card showing contract address (truncated), scan status, tools used, count of each severity (e.g., "3 High · 2 Medium").

#### `src/components/security/VulnerabilityCard.tsx`
**Purpose**: Collapsible card for one vulnerability.

**UI**: shadcn `<Accordion>`:
- Trigger: SeverityBadge + type + "Line N"
- Content: description (paragraph) + CodeSnippetViewer

#### `src/components/security/SeverityBadge.tsx`
```tsx
import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/types/security";

const STYLES: Record<Severity, string> = {
  High:          "bg-red-600 hover:bg-red-600",
  Medium:        "bg-orange-500 hover:bg-orange-500",
  Low:           "bg-yellow-500 hover:bg-yellow-500 text-black",
  Informational: "bg-blue-500 hover:bg-blue-500",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={`${STYLES[severity]} text-white`}>{severity}</Badge>;
}
```

#### `src/components/security/CodeSnippetViewer.tsx`
**Implementation**:
```tsx
"use client";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export function CodeSnippetViewer({ code }: { code: string }) {
  return (
    <SyntaxHighlighter
      language="solidity"
      style={atomDark}
      customStyle={{ borderRadius: "0.375rem", fontSize: "0.85rem" }}
      showLineNumbers
    >
      {code}
    </SyntaxHighlighter>
  );
}
```

### 10.6 Shared components

#### `src/components/shared/LoadingState.tsx`
**UI**: shadcn `<Skeleton>` placeholders (3 stacked bars) inside a card.

#### `src/components/shared/ErrorState.tsx`
**UI**: red-tinted card, error icon, message from `error.message`, optional "Retry" button (calls SWR's `mutate`).

#### `src/components/shared/EmptyState.tsx`
**UI**: centered card with a muted icon + message prop.

#### `src/components/shared/AddressDisplay.tsx`
**Purpose**: Reusable truncated address with click-to-copy.
```tsx
"use client";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { truncateAddress } from "@/lib/format";

export function AddressDisplay({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="font-mono text-sm hover:underline inline-flex items-center gap-1">
      {truncateAddress(address)}
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
```

---

## 11. Implementation Order (concrete checklist)

Follow this order strictly — each step unblocks the next.

### Phase A — Bootstrap (Day 1 morning, ~2h)
- [ ] `cd EVM-Analyzer-SC6107-main/frontend && npx create-next-app@latest .` — choose TS, Tailwind, App Router, src dir, alias `@/*`
- [ ] `npx shadcn@latest init` — defaults, slate, CSS vars
- [ ] `npx shadcn@latest add button card tabs badge table input select accordion skeleton sonner`
- [ ] `npm install ethers@6 recharts react-syntax-highlighter swr lucide-react`
- [ ] `npm install -D @types/react-syntax-highlighter`
- [ ] Create `.env.local` and `.env.example` per §4.6–4.7
- [ ] Verify `npm run dev` shows blank Next.js page

### Phase B — Types & data layer (Day 1 afternoon, ~3h)
- [ ] Create `src/types/{trace,gasState,security,global.d}.ts`
- [ ] Copy `../mock_data/*.json` to `src/mocks/`
- [ ] Write `src/lib/{api,wallet,format,constants}.ts`
- [ ] Write all 4 hooks in `src/hooks/`
- [ ] Run `npx tsc --noEmit` → should be clean

### Phase C — Layout shell (Day 1 evening, ~1h)
- [ ] Write `src/app/layout.tsx`
- [ ] Write `src/components/header/{Header,ConnectWalletButton}.tsx`
- [ ] Write `src/app/page.tsx` with empty Tabs
- [ ] Write `src/components/input/TxHashInput.tsx`
- [ ] Verify dev server shows header + input + 3 empty tabs

**End of Day 1 commit**: `feat(frontend): scaffold + types + layout shell`

### Phase D — Trace tab (Day 2 morning, ~3h)
- [ ] Write `src/components/shared/{LoadingState,ErrorState,EmptyState,AddressDisplay}.tsx`
- [ ] Write `src/components/trace/CallTypeBadge.tsx`
- [ ] Write `src/components/trace/CallTreeNode.tsx` — test expand/collapse against mock
- [ ] Write `src/components/trace/TraceMetaCard.tsx`
- [ ] Write `src/components/trace/TraceTab.tsx` — wire hook + components

**Test**: pick the Uniswap sample in dropdown → Trace tab shows the call tree.

### Phase E — Gas & State tab (Day 2 afternoon, ~3h)
- [ ] Write `src/components/gas-state/{TotalGasCard,OptimizationHintsCard}.tsx`
- [ ] Write `src/components/gas-state/GasBreakdownChart.tsx` — verify chart renders without SSR error
- [ ] Write `src/components/gas-state/{BalanceChangesTable,TokenTransfersTable}.tsx`
- [ ] Write `src/components/gas-state/GasStateTab.tsx`

**End of Day 2 commit**: `feat(frontend): trace tab + gas/state tab with mock data`

### Phase F — Security tab + Wallet (Day 3 morning, ~3h)
- [ ] Write `src/components/security/{SeverityBadge,CodeSnippetViewer}.tsx`
- [ ] Write `src/components/security/{VulnerabilityCard,SecuritySummary}.tsx`
- [ ] Write `src/components/security/SecurityTab.tsx`
- [ ] Write `src/hooks/useWallet.ts`
- [ ] Wire `ConnectWalletButton` to `useWallet`
- [ ] Test MetaMask connect on Sepolia testnet

### Phase G — Polish (Day 3 afternoon, ~2h)
- [ ] Add `LoadingState` skeletons to all 3 tabs
- [ ] Add `ErrorState` retry button
- [ ] Style consistency pass — spacing, font sizes, hover states
- [ ] Run `npx tsc --noEmit` + fix any TS errors
- [ ] Run `npm run lint` + fix warnings

**End of Day 3 commit**: `feat(frontend): security tab + MetaMask + polish`

### Phase H — Integration (Day 4 morning, ~2h)
- [ ] Coordinate with Backend Engineer: confirm `/api/trace/:tx`, `/api/gas-state/:tx`, `/api/security/:addr` paths
- [ ] Set `NEXT_PUBLIC_USE_MOCKS=false` in `.env.local`
- [ ] Manually test all 3 tabs with real backend
- [ ] Report any schema drift back to backend team (do NOT silently patch)

### Phase I — Delivery (Day 4 afternoon, ~2h)
- [ ] Take 6 screenshots (one per tab + wallet connected + expanded vuln card + chart)
- [ ] Add screenshots to root README (or `docs/architecture.md`)
- [ ] `npm install -g vercel && vercel login && vercel --prod`
- [ ] Add deployed URL to root README
- [ ] Write the "Frontend Architecture" section in `docs/architecture.md`

**End of Day 4 commit**: `feat(frontend): wire real APIs + Vercel deploy`

---

## 12. Verification Checklist

You're done when ALL of these are true:

### Functionality
- [ ] `npm run dev` starts cleanly, no console errors
- [ ] Header shows wallet connect button (or address if connected)
- [ ] Sample tx dropdown populates from `SAMPLE_TXS`
- [ ] Trace tab renders the call tree, every node expands/collapses
- [ ] Gas tab renders the bar chart with all entries
- [ ] State tables show all balance changes and token transfers
- [ ] Security tab shows vulnerability cards with color-coded severity
- [ ] Code snippets render with Solidity syntax highlighting
- [ ] Switching to `NEXT_PUBLIC_USE_MOCKS=false` calls real backend without code changes

### Code quality
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0 (or warnings only)
- [ ] No `any` types except in `global.d.ts`
- [ ] No `console.log` leftovers
- [ ] All client components marked with `"use client"`

### Deliverables
- [ ] Vercel deploy URL in root README
- [ ] At least 5 commits on `feature/frontend-ui` branch from your GitHub account
- [ ] Screenshots in `docs/architecture.md`
- [ ] 1-page "Frontend Architecture" section written

---

## 13. Common Pitfalls

| Pitfall | Cause | Fix |
|---|---|---|
| `ReferenceError: window is not defined` | Recharts SSR | Add `"use client"` to any file importing Recharts |
| `Module not found: 'react-syntax-highlighter/...'` | Wrong import path | Use `react-syntax-highlighter/dist/esm/styles/prism` (with `esm`) |
| `window.ethereum` is `any` | Missing types | Define `global.d.ts` as in §5.4 |
| `npx shadcn-ui` fails | Package renamed | Use `npx shadcn@latest` |
| Mock JSON import fails | TS strict mode | Add `"resolveJsonModule": true` to `tsconfig.json` |
| CallTreeNode infinite loop | Backend sent circular ref | Depth guard `if (depth > 50) return null` |
| MetaMask not detected in headless tests | No `window.ethereum` | Show "Install MetaMask" UI when `!hasEthereum()` |
| `Hydration mismatch` warnings | Date/Math.random on server | Move dynamic values into `useEffect` |

---

## 14. Coordination Points with Teammates

| Touch point | When | What to confirm |
|---|---|---|
| **Backend Trace Engineer (#1)** | Day 1 | Sample tx hashes match `SAMPLE_TXS` in `src/lib/constants.ts` |
| **Backend Gas Engineer (#2)** | Day 1 | Endpoint path: `/api/gas-state/:txHash` (single combined endpoint) |
| **Backend Security Engineer (#3)** | Day 1 | Endpoint accepts contract address; sample contracts known |
| **Backend Integration Engineer (#4)** | Day 1 + Day 4 | Base URL for backend API → `NEXT_PUBLIC_API_BASE_URL` |
| **Frontend Co-dev (#6)** | Day 1 | Split: you take Trace + Gas; they take State + Security (optional) |
| **Architect/PM (#5)** | Day 4 | Screenshots delivered; architecture.md section written |

---

## 15. Summary

| Aspect | Decision |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind + shadcn/ui (dark theme) |
| Web3 | ethers.js v6, MetaMask only |
| Data fetching | SWR with mock-first switch |
| Charts | Recharts |
| Code highlighting | react-syntax-highlighter |
| Total files to write by hand | ~40 source files, ~1500 lines |
| Estimated effort | 20 hours over 4 days |
| Integration risk | Low (single env flag, schemas pre-locked) |

This document is the single source of truth for the frontend module. If the design changes mid-implementation, update this file and notify the team. The `mock_data/` JSON schemas are the immovable contract — everything in this design adapts to them, not the other way around.
