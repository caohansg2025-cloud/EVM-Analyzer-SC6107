# Frontend Adaptation Guide — Integrating Teammates' Backend Work

> **Status**: ✅ All adaptations applied and verified (tsc / lint / build exit 0).
> **Trigger**: Position 1 and Position 3 have pushed initial backend implementations. This guide documents what the frontend needed to change to stay compatible.

---

## 1. What Teammates Shipped

| Position | Module | Artifact | Status |
|---|---|---|---|
| **1 — Trace** | `backend/trace_api.py` | **FastAPI HTTP server** exposing `GET /api/trace/{tx_hash}` with CORS open and two modes (Mock / Real Alchemy RPC) | ✅ Mock mode shape-compatible; real mode incomplete |
| **2 — Gas** | `backend/gas_*` | _Not started yet (待补充 per README §How to Run)_ | ⏳ Pending |
| **3 — Security** | `backend/security_scan.py` (502 lines) | **Python CLI** that runs Slither, emits JSON matching the security schema | ✅ Shape-compatible but with **looser fields** than the original mock |
| **5 — Architect** | `pyproject.toml`, `uv.lock`, `test_contracts/*.sol`, README §How to Run | Python project setup + 4 vulnerable Solidity fixtures | ✅ |

---

## 2. Why the Frontend Needs Adaptation

### 2.1 Schema drift from Position 3 (the breaking change)

The original `mock_data/security_response.json` had this shape (Phase 1 typing):

```typescript
{
  contractAddress: string,        // always present, hex string
  contractName: string,
  scanStatus: "Completed" | "Failed" | "Pending",
  toolsUsed: string[],
  vulnerabilities: [
    { id: string, type: string, severity: ..., line: number, ... },
  ],
}
```

Position 3's actual CLI output is a **superset**: the same fields are there, but several can take values the old type didn't allow:

| Field | Old type | New reality | Why |
|---|---|---|---|
| `contractAddress` | `string` | `string \| null` | CLI scans local `.sol` files which have no on-chain address |
| `line` | `number` | `number \| null` | Slither sometimes reports findings without source-mapping (e.g. pragma-level checks) |
| `scanStatus` | 3 values | **4 values** — adds `"CompletedWithNoFindings"` | Distinct from `Failed`: scan ran fine, just nothing found |
| _(new)_ `error` | absent | optional `string` | Set when `scanStatus === "Failed"` (e.g. solc version missing) |

If the frontend casts `as SecurityResponse` against the old type, TypeScript happily compiles **but the UI crashes at runtime** the moment any of these new shapes appear.

### 2.2 No-op for Position 1 (already compatible)

`trace_api.py` in **mock mode** (the default) re-serves `mock_data/trace_response.json` verbatim with `txHash` substituted in. That matches `TraceResponse` exactly, so no frontend changes needed — just flip `NEXT_PUBLIC_USE_MOCKS=false` and point at the FastAPI server.

In **real Alchemy mode**, the response shape is incomplete (`{ txHash, status, calls }`, missing `traceTree`, `blockNumber`, `from`, `to`). **That's a backend bug**, not a frontend adaptation target. Push back to Position 1.

### 2.3 Nice-to-have for the 4 fixture contracts

Position 5 dropped 4 vulnerable contracts in `test_contracts/`:
- `AccessControlBug.sol`
- `OverflowToken.sol`
- `UncheckedCall.sol`
- `VulnerableVault.sol`

The frontend's `SAMPLE_CONTRACTS` dropdown can list these so demo viewers have multiple cases to click through. Until the backend wraps the CLI behind an HTTP endpoint that accepts contract names (or until real on-chain addresses are deployed), they reuse the same mock JSON via the existing fetcher.

---

## 3. Adaptations Applied (this commit)

### 3.1 `src/types/security.ts` — loosened type definitions

```diff
- export type ScanStatus = "Completed" | "Failed" | "Pending";
+ export type ScanStatus =
+   | "Completed"
+   | "CompletedWithNoFindings"
+   | "Failed"
+   | "Pending";

  export interface Vulnerability {
    id: string;
    type: string;
    severity: Severity;
-   line: number;
+   line: number | null;
    description: string;
    codeSnippet: string;
  }

  export interface SecurityResponse {
-   contractAddress: string;
+   contractAddress: string | null;
    contractName: string;
    scanStatus: ScanStatus;
    toolsUsed: string[];
    vulnerabilities: Vulnerability[];
+   /** Present only when scanStatus is "Failed". Human-readable cause. */
+   error?: string;
  }
```

### 3.2 `src/components/security/SecuritySummary.tsx` — handle null + error + new status

- When `contractAddress === null`, render `<FileCode/>` icon + "Local file scan (no on-chain address)" instead of `<AddressDisplay>`.
- When `scanStatus === "Failed"`, render a red-bordered inline block showing the `error` message.
- Added `CompletedWithNoFindings` to the `STATUS_COLORS` map (emerald) and `STATUS_LABELS` map ("No findings").

### 3.3 `src/components/security/VulnerabilityCard.tsx` — handle null line

- Replaced `"Line {vuln.line}"` with a `lineLabel` that emits `"Line —"` when `line === null`.
- Passes `startLine={vuln.line ?? undefined}` to `<CodeSnippetViewer>` so the snippet renders cleanly (line numbers default to 1).

### 3.4 `src/components/security/SecurityTab.tsx` — Failed status short-circuit

- New early return: when `data.scanStatus === "Failed"`, render only the `<SecuritySummary>` (which carries the error message) and skip the vulnerability list / empty state entirely. Mixing the error and an empty list would be misleading.
- The existing "No vulnerabilities" empty state now also covers `CompletedWithNoFindings` since both reach that branch via `sorted.length === 0`.

### 3.5 `src/lib/constants.ts` — 4 extra fixture contracts

- Added entries for each `.sol` file in `test_contracts/` with placeholder addresses. Until a real backend exposes them via HTTP, picking any returns the same locked mock JSON (acceptable for demo purposes).

### 3.6 No changes needed for

- Trace components (mock-mode `trace_api.py` is byte-compatible)
- Gas & State components (no backend yet)
- Hooks, API client, wallet code, header, input — all untouched

---

## 4. Backend Integration Runbook (for the demo)

This is the runbook your team will follow on demo day to swap the frontend from mocks to live data. Frontend already supports it via one env flag.

### 4.1 Start Position 1's FastAPI server

From the project root:

```powershell
# One-time setup
uv sync                              # installs FastAPI, uvicorn, slither, etc.

# Run the server (mock mode = default, no Alchemy key needed)
uv run uvicorn backend.trace_api:app --host 0.0.0.0 --port 8000 --reload
```

Verify the endpoint responds:

```powershell
curl http://localhost:8000/api/trace/0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026
# → returns the mock trace JSON
```

### 4.2 Flip the frontend to live API

Edit `frontend/.env.local`:

```diff
- NEXT_PUBLIC_USE_MOCKS=true
+ NEXT_PUBLIC_USE_MOCKS=false
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Restart the frontend dev server (env vars don't hot-reload):

```powershell
# Ctrl+C in the dev server window, then:
cd frontend
npm run dev
```

### 4.3 What will work / what won't on demo day

| Tab | Mock mode (default) | Live with current backend |
|---|---|---|
| **Trace** | ✅ Auto-loads sample data | ✅ FastAPI mock-mode returns same JSON. Real Alchemy mode is incomplete — keep `USE_MOCK=True` in the backend's `.env` |
| **Gas & State** | ✅ Auto-loads sample data | ❌ No backend yet — frontend will show ErrorState. Keep `NEXT_PUBLIC_USE_MOCKS=true` to avoid this, OR have the Backend Integration Engineer (Position 4) add a stub `/api/gas-state/:txHash` route to `trace_api.py` |
| **Security** | ✅ Auto-loads sample data | ❌ Position 3's tool is CLI-only. To make Security work over HTTP, wrap `security_scan.py` in a FastAPI route (~30 lines) — see §4.4 below |

### 4.4 Quick-and-dirty HTTP wrapper for Position 3's CLI

If the team wants Security to work end-to-end in the demo, add this snippet to `backend/trace_api.py` (or a new `backend/security_api.py`):

```python
from fastapi import HTTPException
from pathlib import Path
from backend.security_scan import build_report

# Maps the placeholder addresses from frontend SAMPLE_CONTRACTS
# to actual paths in test_contracts/.
CONTRACT_ADDRESS_TO_PATH = {
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "test_contracts/VulnerableVault.sol",
    "0x0000000000000000000000000000000000000a11": "test_contracts/AccessControlBug.sol",
    "0x0000000000000000000000000000000000000b22": "test_contracts/OverflowToken.sol",
    "0x0000000000000000000000000000000000000c33": "test_contracts/UncheckedCall.sol",
    "0x0000000000000000000000000000000000000d44": "test_contracts/VulnerableVault.sol",
}

@app.get("/api/security/{address}")
def get_security_scan(address: str):
    path = CONTRACT_ADDRESS_TO_PATH.get(address.lower())
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail=f"No contract registered for {address}")
    return build_report(Path(path))
```

The response shape will be exactly what the (newly loosened) frontend types accept.

### 4.5 Vercel deployment with a live backend

When the backend is also deployed (e.g. on Render, Railway, or a Vercel API route), set in Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_USE_MOCKS = false
NEXT_PUBLIC_API_BASE_URL = https://your-backend.example.com
```

Redeploy. See `docs/deployment.md` for the full Vercel guide.

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Position 1's real-RPC response shape lands in production accidentally | Medium | Keep `USE_MOCK=True` in `backend/.env` until Position 1 reshapes the real-mode response to match `TraceResponse` |
| Position 3's `null line` causes UI crash | Low — already mitigated | This commit's VulnerabilityCard handles it |
| `null contractAddress` from CLI breaks Security tab | Low — already mitigated | SecuritySummary handles it with the "Local file scan" placeholder |
| Solc version mismatch crashes scanner | High during integration | `security_scan.py` already returns `scanStatus: "Failed"` with the `error` field; the frontend now renders it cleanly |
| Gas & State has no backend | High for demo | Either keep mocks ON for that tab, or have Position 2/4 stub a `/api/gas-state/:txHash` route returning the mock JSON |
| CORS rejects requests if backend tightens later | Low | `trace_api.py` currently has `allow_origins=["*"]` — open enough for any dev setup |

---

## 6. What's NOT Changed

To make code review easy, the negative list:

- `src/types/{trace,gasState,global.d}.ts` — untouched
- `src/lib/{api,format,wallet,utils}.ts` — untouched
- `src/hooks/*` — untouched
- `src/components/{header,input,shared,trace,gas-state}/*` — untouched
- `src/components/security/{SeverityBadge,CodeSnippetViewer}.tsx` — untouched
- `src/components/ui/*` — never touch (shadcn-generated)
- `src/app/{layout,page}.tsx`, `globals.css` — untouched
- All config files — untouched
- All `mock_data/*.json` — never touch (inter-team contract)

Only **5 files modified** total: `security.ts` (types), `SecuritySummary.tsx`, `VulnerabilityCard.tsx`, `SecurityTab.tsx`, `constants.ts`.
