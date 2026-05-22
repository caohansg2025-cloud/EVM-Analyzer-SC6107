# EVM Transaction Debugger & Analyzer — Technical Documentation

## 1. Project Overview

This project is a debugger and analyzer for Ethereum transactions. Its core capabilities are:

- Transaction Trace Analysis: turn internal calls inside a transaction into a visualized call tree.
- Gas Profiling: aggregate total gas, per-function gas share, and opcode-level optimization suggestions.
- State Diff Visualization: surface ETH balance changes and token transfers.
- Vulnerability Detection: scan Solidity fixtures with Slither and output a normalized vulnerability report.

The project uses a decoupled frontend / backend layout:

| Part | Tech stack | Directory |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, SWR, Recharts | `frontend/` |
| Backend | Python, FastAPI, uvicorn, Slither, solc-select | `backend/` |
| Contract fixtures | Solidity | `test_contracts/` |
| Shared schema | JSON | `mock_data/` |
| Documentation | Markdown | `docs/` |

## 2. Quick Start

### 2.1 Backend

```bash
uv sync
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

`USE_MOCK=true` by default, so the backend reads `mock_data/*.json` and does not require an RPC key.

### 2.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

URLs:

- Frontend: `http://127.0.0.1:3000`
- Backend Swagger: `http://127.0.0.1:8000/docs`

### 2.3 Connecting to the Real Backend

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

The backend `.env` can live at the repository root or in `backend/`:

```env
USE_MOCK=false
ALCHEMY_RPC_URL=https://...
QUICKNODE_RPC_URL=https://...
```

Notes:

- `ALCHEMY_RPC_URL` is used for `eth_getTransactionByHash` and receipt lookups.
- `QUICKNODE_RPC_URL` is used for `debug_traceTransaction`. This RPC must support the debug namespace.
- For classroom demos, staying in mock mode is sufficient.

## 3. API Contracts

### 3.1 Trace API

Request:

```http
GET /api/trace/{tx_hash}
```

Response:

```json
{
  "txHash": "0x...",
  "blockNumber": 19840211,
  "from": "0x...",
  "to": "0x...",
  "status": "Success",
  "traceTree": {
    "type": "CALL",
    "from": "0x...",
    "to": "0x...",
    "value": "1.5 ETH",
    "gasUsed": 125000,
    "functionName": "swapExactETHForTokens(...)",
    "calls": []
  }
}
```

Contract sources:

- Mock: `mock_data/trace_response.json`
- Frontend type: `frontend/src/types/trace.ts`
- Backend endpoint: `backend/app/main.py::get_trace`

### 3.2 Gas + State API

Request:

```http
GET /api/gas-state/{tx_hash}
```

Response:

```json
{
  "txHash": "0x...",
  "gasProfiling": {
    "totalGasUsed": 125000,
    "breakdown": [
      {
        "function": "WETH.deposit",
        "gas": 25000,
        "percentage": 20
      }
    ],
    "optimizationSuggestions": "..."
  },
  "stateDiffs": {
    "balanceChanges": [
      {
        "address": "0x...",
        "asset": "ETH",
        "before": "10.0",
        "after": "8.498"
      }
    ],
    "tokenTransfers": [
      {
        "token": "USDC",
        "tokenAddress": "0x...",
        "from": "0x...",
        "to": "0x...",
        "amount": "4500.00"
      }
    ]
  }
}
```

Contract sources:

- Mock: `mock_data/gas_state_response.json`
- Frontend type: `frontend/src/types/gasState.ts`
- Backend endpoint: `backend/app/main.py::get_gas_state`

### 3.3 Security API

Request:

```http
GET /api/security/{address}
```

Response:

```json
{
  "contractAddress": "0x...",
  "contractName": "VulnerableVault",
  "scanStatus": "Completed",
  "toolsUsed": ["Slither v0.11.5"],
  "vulnerabilities": [
    {
      "id": "ERR-001",
      "type": "Reentrancy",
      "severity": "High",
      "line": 22,
      "description": "Reentrancy in ...",
      "codeSnippet": "(bool ok, ) = msg.sender.call{value: amount}(\"\");"
    }
  ]
}
```

Contract sources:

- Mock: `mock_data/security_response.json`
- Frontend type: `frontend/src/types/security.ts`
- Backend endpoint: `backend/app/main.py::get_security_scan`
- Scanner: `backend/security_scan.py`

Note: the backend may also return `scanStatus: "CompletedWithNoFindings"`, which is not yet listed in the current frontend type. If we later need to render the no-findings case, also update `frontend/src/types/security.ts` to keep them in sync.

## 4. Module Maintenance Notes

### 4.1 Frontend

Key paths:

| File | Role |
| --- | --- |
| `frontend/src/app/page.tsx` | Main page; composes the input area and the three analysis tabs. |
| `frontend/src/lib/api.ts` | Mock / real-backend switching logic. |
| `frontend/src/hooks/useTrace.ts` | Trace data fetching and SWR caching. |
| `frontend/src/hooks/useGasState.ts` | Gas + state data fetching and SWR caching. |
| `frontend/src/hooks/useSecurity.ts` | Security data fetching and SWR caching. |
| `frontend/src/types/*.ts` | TypeScript contracts aligned with `mock_data`. |

Recommended order of changes when modifying API fields:

1. Update `mock_data/*.json`.
2. Update `frontend/src/types/*.ts`.
3. Update the corresponding response conversion in `backend/app/main.py`.
4. Start the frontend and verify that the three tabs still render correctly.

### 4.2 Backend

Key paths:

| File | Role |
| --- | --- |
| `backend/app/main.py` | Unified FastAPI entry point, mock loader, response conversion, and compatibility endpoints. |
| `backend/src/api/tx.py` | Transaction and receipt lookups. |
| `backend/src/api/trace.py` | `debug_traceTransaction` calls. |
| `backend/src/gas/analyzer.py` | Gas profiling entry point. |
| `backend/src/gas/parser.py` | Call-tree traversal, per-function gas aggregation, opcode gas roll-up. |
| `backend/src/state/analyzer.py` | State diff, ETH balance, and token-transfer extraction. |
| `backend/security_scan.py` | Slither scanning, detector mapping, and security-report normalization. |

Backend real-mode dependencies:

- An RPC endpoint supporting transaction, receipt, and debug trace.
- A Slither executable available inside the `uv run` environment.
- `solc-select` with the matching Solidity compiler version installed.

### 4.3 Security Scanner

Single-file scan:

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty
```

Specify an output file:

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty --output out/security.json
```

Install compilers (example):

```bash
uv run solc-select install 0.8.20
uv run solc-select install 0.7.6
```

## 5. Testing & Quality Checks

### 5.1 Backend Tests

```bash
uv run pytest
```

The existing tests live in `backend/tests/` and mainly cover:

- The trace endpoint returns 200 in mock mode.
- Leading / trailing whitespace in tx hashes is stripped.
- Invalid paths return 404.
- The security-scan schema and scan logic.

### 5.2 Frontend Checks

```bash
cd frontend
npm run lint
npm run build
```

Before merging, run at minimum:

- `uv run pytest`
- `npm run lint`
- `npm run build`

If Node or Python dependencies are missing locally, first run `uv sync` and `npm install`.

## 6. Demo Flow Suggestions

For a stable demo, use mock mode:

1. Start the backend, or just let the frontend use local mocks.
2. Open the home page and keep the default sample transaction.
3. Show the Trace tab and explain how the call tree reflects internal contract calls.
4. Switch to the Gas & State tab and walk through the gas breakdown, optimization suggestions, balance changes, and token transfers.
5. Switch to the Security tab and explain how Slither output is normalized into vulnerability cards.
6. Finally, explain that real mode requires an RPC key, debug-trace support, and a Slither / solc environment.

During the defense, emphasize that `mock_data` is the team's API contract — it reduces schema drift while frontend and backend work in parallel.

## 7. Known Risks & Improvement Items

| Risk / gap | Impact | Suggestion |
| --- | --- | --- |
| RPC provider doesn't support `debug_traceTransaction` | Real trace / gas / state cannot be produced | Use a node or service that supports the debug namespace. |
| Security endpoint depends on the local fixture mapping | Cannot scan arbitrary real contract addresses | Add Etherscan verified-source fetching. |
| CORS currently allows all origins | Insufficient security boundary in production | Restrict allowed origins on deployment. |
| Frontend security type omits `CompletedWithNoFindings` | Real no-findings results may cause type mismatches | Update the `ScanStatus` union. |
| Storage diff is not yet shown in the frontend | Incomplete state-change analysis | Add a storage-changes table or a slot decoder. |

## 8. Branching & Collaboration Conventions

This Role-5 documentation work uses the branch:

```bash
docs/architecture-ppt
```

Recommended commit scope is limited to:

- `docs/architecture.md`
- `docs/technical-documentation.md`
- Follow-up slide deck, demo script, or delivery notes.

Avoid modifying frontend / backend business code on the docs branch to reduce merge conflicts with members 1–4.
