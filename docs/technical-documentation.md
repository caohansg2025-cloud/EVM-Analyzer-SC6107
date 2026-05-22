# EVM Transaction Debugger & Analyzer 技术文档

## 1. 项目概览

本项目是一个面向 Ethereum 交易的调试与分析工具，核心能力包括：

- Transaction Trace Analysis: 将交易内部调用转换为可视化调用树。
- Gas Profiling: 汇总总 gas、函数级 gas 占比和 opcode 级优化建议。
- State Diff Visualization: 展示 ETH 余额变化和 token transfer。
- Vulnerability Detection: 使用 Slither 扫描 Solidity fixture 并输出标准化漏洞报告。

项目采用前后端分离：

| 部分 | 技术栈 | 目录 |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, SWR, Recharts | `frontend/` |
| Backend | Python, FastAPI, uvicorn, Slither, solc-select | `backend/` |
| Contract fixtures | Solidity | `test_contracts/` |
| Shared schema | JSON | `mock_data/` |
| Documentation | Markdown | `docs/` |

## 2. 快速启动

### 2.1 后端

```bash
uv sync
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

默认 `USE_MOCK=true`，后端会读取 `mock_data/*.json`，不依赖 RPC key。

### 2.2 前端

```bash
cd frontend
npm install
npm run dev
```

访问：

- Frontend: `http://127.0.0.1:3000`
- Backend Swagger: `http://127.0.0.1:8000/docs`

### 2.3 连接真实后端

前端 `frontend/.env.local`:

```env
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

后端 `.env` 可放在仓库根目录或 `backend/`：

```env
USE_MOCK=false
ALCHEMY_RPC_URL=https://...
QUICKNODE_RPC_URL=https://...
```

说明：

- `ALCHEMY_RPC_URL` 用于 `eth_getTransactionByHash` 和 receipt 查询。
- `QUICKNODE_RPC_URL` 用于 `debug_traceTransaction`。该 RPC 必须支持 debug namespace。
- 若只做课堂演示，保持 mock 模式即可。

## 3. API 契约

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

契约来源：

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

契约来源：

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

契约来源：

- Mock: `mock_data/security_response.json`
- Frontend type: `frontend/src/types/security.ts`
- Backend endpoint: `backend/app/main.py::get_security_scan`
- Scanner: `backend/security_scan.py`

注意：后端还可能返回 `scanStatus: "CompletedWithNoFindings"`，当前前端类型中尚未列入该状态。若后续要展示无发现结果，建议同步更新 `frontend/src/types/security.ts`。

## 4. 模块维护说明

### 4.1 Frontend

关键路径：

| 文件 | 作用 |
| --- | --- |
| `frontend/src/app/page.tsx` | 主页面，组合输入区和三类分析 tab。 |
| `frontend/src/lib/api.ts` | mock/real backend 切换逻辑。 |
| `frontend/src/hooks/useTrace.ts` | Trace 数据请求与 SWR 缓存。 |
| `frontend/src/hooks/useGasState.ts` | Gas + State 数据请求与 SWR 缓存。 |
| `frontend/src/hooks/useSecurity.ts` | Security 数据请求与 SWR 缓存。 |
| `frontend/src/types/*.ts` | 与 `mock_data` 对齐的 TypeScript 契约。 |

修改 API 字段时的推荐顺序：

1. 修改 `mock_data/*.json`。
2. 修改 `frontend/src/types/*.ts`。
3. 修改 `backend/app/main.py` 中对应响应转换。
4. 启动前端并检查三个 tab 是否仍可渲染。

### 4.2 Backend

关键路径：

| 文件 | 作用 |
| --- | --- |
| `backend/app/main.py` | FastAPI 统一入口、mock loader、响应转换和兼容接口。 |
| `backend/src/api/tx.py` | 交易和 receipt 查询。 |
| `backend/src/api/trace.py` | `debug_traceTransaction` 调用。 |
| `backend/src/gas/analyzer.py` | gas profiling 入口。 |
| `backend/src/gas/parser.py` | call tree 遍历、函数 gas 聚合、opcode gas 汇总。 |
| `backend/src/state/analyzer.py` | state diff、ETH balance 和 token transfer 提取。 |
| `backend/security_scan.py` | Slither 扫描、detector 映射和安全报告标准化。 |

后端真实模式依赖：

- RPC endpoint 支持 transaction、receipt、debug trace。
- Slither 可执行文件在 `uv run` 环境中可用。
- `solc-select` 已安装对应 Solidity compiler 版本。

### 4.3 Security Scanner

单文件扫描：

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty
```

指定输出文件：

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty --output out/security.json
```

安装 compiler 示例：

```bash
uv run solc-select install 0.8.20
uv run solc-select install 0.7.6
```

## 5. 测试与质量检查

### 5.1 后端测试

```bash
uv run pytest
```

现有测试位于 `backend/tests/`，主要覆盖：

- mock 模式下 trace endpoint 返回 200。
- tx hash 首尾空格清理。
- 非法路径返回 404。
- security scan 的 schema 和扫描逻辑。

### 5.2 前端检查

```bash
cd frontend
npm run lint
npm run build
```

建议在合并前至少执行：

- `uv run pytest`
- `npm run lint`
- `npm run build`

若本地缺少 Node/Python 依赖，应先执行 `uv sync` 和 `npm install`。

## 6. Demo 流程建议

稳定演示推荐使用 mock 模式：

1. 启动后端或直接让前端使用本地 mocks。
2. 打开首页，保持默认 sample transaction。
3. 展示 Trace tab，说明 call tree 如何反映内部合约调用。
4. 切换 Gas & State tab，说明 gas breakdown、优化建议、balance change 和 token transfer。
5. 切换 Security tab，说明 Slither 输出如何被标准化为漏洞卡片。
6. 最后说明真实模式需要 RPC key、debug trace 支持和 Slither/solc 环境。

答辩中建议强调：`mock_data` 是团队协作的 API contract，减少了前后端并行开发期间的 schema drift。

## 7. 已知风险与改进项

| 风险 / 缺口 | 影响 | 建议 |
| --- | --- | --- |
| RPC provider 不支持 `debug_traceTransaction` | 真实 trace/gas/state 无法生成 | 使用支持 debug namespace 的节点或服务。 |
| Security endpoint 依赖本地 fixture 映射 | 无法扫描任意真实合约地址 | 增加 Etherscan verified source fetch。 |
| CORS 当前放开所有来源 | 生产环境安全边界不足 | 部署时限制 allowed origins。 |
| 前端 security type 未包含 `CompletedWithNoFindings` | 真实无漏洞结果可能产生类型不一致 | 更新 `ScanStatus` union。 |
| Storage diff 尚未前端展示 | 状态变化分析不完整 | 新增 storage changes table 或 slot decoder。 |

## 8. 分支与协作规范

本次五号位文档工作使用分支：

```bash
docs/architecture-ppt
```

推荐提交范围只包含：

- `docs/architecture.md`
- `docs/technical-documentation.md`
- 后续 PPT、demo script 或交付说明文件

避免在文档分支中修改前端/后端业务代码，以减少与 1-4 号位的合并冲突。
