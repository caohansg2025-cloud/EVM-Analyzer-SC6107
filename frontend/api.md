# 后端 API 接口规范

> **面向对象**：后端三位工程师（Position 1/2/3）+ 后端集成工程师（Position 4）
> **状态**：⚠️ **铁律 (Iron Rule)** —— 字段名、嵌套结构必须 100% 匹配以下规范
> **基础事实**：所有 schema 来自 `mock_data/*.json`，本文档是其形式化版本
> **前端调用方**：`frontend/src/lib/api.ts`

如果你是后端工程师，请按本文档实现 HTTP 接口；前端的 mock-real 切换是基于这些字段名硬编码的，任何偏离都会导致 Day 4 整合日翻车。

---

## 目录

1. [全局约定](#1-全局约定)
2. [接口 1：GET /api/trace/:txHash](#2-接口-1get-apitracetxhash)
3. [接口 2：GET /api/gas-state/:txHash](#3-接口-2get-apigas-statetxhash)
4. [接口 3：GET /api/security/:address](#4-接口-3get-apisecurityaddress)
5. [错误响应统一格式](#5-错误响应统一格式)
6. [性能与缓存预期](#6-性能与缓存预期)
7. [CORS 与本地联调](#7-cors-与本地联调)
8. [测试用例（必须通过）](#8-测试用例必须通过)

---

## 1. 全局约定

### 1.1 基础地址

前端通过 `NEXT_PUBLIC_API_BASE_URL` 环境变量配置，默认 `http://localhost:8000`。

后端服务必须监听 8000 端口，或在 Day 4 集成时通知前端工程师调整 `.env.local`。

### 1.2 请求格式

| 项目 | 约定 |
|---|---|
| 协议 | HTTP/1.1（HTTPS 在 Day 4 部署时再考虑） |
| 编码 | UTF-8（响应体中文描述需 UTF-8） |
| Content-Type | `application/json; charset=utf-8` |
| 请求方法 | 全部使用 **GET**（无副作用） |
| 认证 | **无**（课程项目不要求） |

### 1.3 响应格式

| 项目 | 约定 |
|---|---|
| 成功状态码 | `200 OK` |
| 失败状态码 | `4xx` 客户端错误 / `5xx` 服务端错误（详见 §5） |
| 响应体 | 必须是单一 JSON 对象，结构按各接口规范 |
| 字段顺序 | 不强求，但**字段名大小写必须严格一致**（驼峰，例如 `txHash` 不能写成 `txhash` 或 `tx_hash`） |
| 空数组 | 用 `[]`，不可省略字段 |
| 空字符串 | 用 `""`，不可省略字段 |

### 1.4 通用字段类型说明

| 类型 | 表示方式 | 示例 |
|---|---|---|
| Ethereum 地址 | 0x 前缀 + 40 位小写十六进制字符串 | `"0xda9dfa130df4de4673b89022ee50ff26f6ea73cf"` |
| Tx Hash | 0x 前缀 + 64 位小写十六进制字符串 | `"0x5c504ed4...22026"` |
| 金额 | **预格式化字符串**（不是原始 wei） | `"1.5 ETH"`、`"4500.00"`、`"0 ETH"` |
| 区块号 | JSON 数字（非字符串） | `19840211` |
| Gas | JSON 数字 | `125000` |

**关键设计**：金额已由后端格式化为字符串，前端不做 wei → ETH 换算。这样后端可以决定显示精度，前端只负责渲染。

---

## 2. 接口 1：GET /api/trace/:txHash

### 2.1 接口说明

获取一笔交易的调用栈树（call tree）。
**负责后端工程师**：Position 1 — Transaction Trace Engineer。
**数据来源**：以太坊节点 `debug_traceTransaction` RPC，使用 `callTracer` tracer。

### 2.2 请求

```
GET /api/trace/0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026
```

**路径参数**：

| 参数 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `:txHash` | string (0x + 64 hex) | 是 | 交易哈希 |

### 2.3 成功响应（200 OK）

```json
{
  "txHash": "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026",
  "blockNumber": 19840211,
  "from": "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf",
  "to": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  "status": "Success",
  "traceTree": {
    "type": "CALL",
    "from": "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf",
    "to": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "value": "1.5 ETH",
    "gasUsed": 125000,
    "functionName": "swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)",
    "calls": [
      {
        "type": "CALL",
        "from": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        "to": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "value": "1.5 ETH",
        "gasUsed": 25000,
        "functionName": "deposit()",
        "calls": []
      },
      {
        "type": "DELEGATECALL",
        "from": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
        "to": "0xef1c6e67703c7bd7107eed83034424474c4a234a",
        "value": "0 ETH",
        "gasUsed": 85000,
        "functionName": "uniswapV3Swap(bytes path, address recipient, uint256 amountIn)",
        "calls": []
      }
    ]
  }
}
```

### 2.4 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `txHash` | string | 交易哈希（回显） |
| `blockNumber` | number | 区块号 |
| `from` | string | 发起方地址 |
| `to` | string | 接收方地址（合约调用时即合约地址） |
| `status` | `"Success" \| "Failed"` | 交易最终状态 |
| `traceTree` | object (CallNode) | 调用栈根节点（见下） |

**CallNode 递归结构**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `"CALL" \| "DELEGATECALL" \| "STATICCALL" \| "CREATE"` | EVM 调用类型 |
| `from` | string | 调用发起方 |
| `to` | string | 被调用合约 |
| `value` | string | 转账金额（预格式化为字符串，必须带单位，如 `"1.5 ETH"`、`"0 ETH"`） |
| `gasUsed` | number | 该帧消耗的 Gas |
| `functionName` | string | 解码后的函数签名；无法解码时可填 `"0xabcd1234..."`（前 4 字节 selector） |
| `calls` | CallNode[] | 子调用数组，叶子节点为 `[]` |

### 2.5 边界情况

| 场景 | 后端应返回 |
|---|---|
| 交易不存在 | `404`，见 §5 |
| 交易失败（revert） | `200`，`status: "Failed"`，`traceTree` 仍然填充已执行部分 |
| 无内部调用（普通 EOA→EOA 转账） | `200`，`traceTree.calls` 为 `[]` |
| 合约创建交易 | `200`，根节点 `type: "CREATE"`，`to` 为新合约地址 |
| RPC 调用超时 | `503`，见 §5 |

---

## 3. 接口 2：GET /api/gas-state/:txHash

### 3.1 接口说明

获取一笔交易的 **Gas 分析 + 状态变更**（两个功能合并到一个接口）。
**负责后端工程师**：Position 2 — Gas & State Engineer。
**数据来源**：
- Gas：从接口 1 返回的 traceTree 中聚合
- 状态变更：解析 `Transfer` 事件 + 调用 `prestateTracer`

### 3.2 请求

```
GET /api/gas-state/0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026
```

### 3.3 成功响应（200 OK）

```json
{
  "txHash": "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026",
  "gasProfiling": {
    "totalGasUsed": 125000,
    "breakdown": [
      { "function": "swapExactETHForTokens", "gas": 15000, "percentage": 12 },
      { "function": "WETH.deposit", "gas": 25000, "percentage": 20 },
      { "function": "UniswapV3Pool.swap", "gas": 85000, "percentage": 68 }
    ],
    "optimizationSuggestions": "发现高开销的 DELEGATECALL 操作，建议检查存储插槽（Storage Slots）读取是否可进行多路批处理优化。"
  },
  "stateDiffs": {
    "balanceChanges": [
      { "address": "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf", "asset": "ETH", "before": "10.0", "after": "8.498" }
    ],
    "tokenTransfers": [
      {
        "token": "USDC",
        "tokenAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "from": "0xUniswapV3Pool",
        "to": "0xda9dfa130df4de4673b89022ee50ff26f6ea73cf",
        "amount": "4500.00"
      }
    ]
  }
}
```

### 3.4 字段说明

#### `gasProfiling` 子对象

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalGasUsed` | number | 交易总 Gas |
| `breakdown` | array | 各函数/操作的 Gas 占比，**按 percentage 降序排列** |
| `breakdown[].function` | string | 函数标签，例如 `"UniswapV3Pool.swap"` |
| `breakdown[].gas` | number | 该项消耗的绝对 Gas |
| `breakdown[].percentage` | number (0-100) | 占总 Gas 的百分比，**整数或一位小数** |
| `optimizationSuggestions` | string | 自由文本建议，**可中文**，UTF-8 编码。如无建议返回 `""` |

#### `stateDiffs` 子对象

| 字段 | 类型 | 说明 |
|---|---|---|
| `balanceChanges` | array | ETH/原生币余额变化 |
| `balanceChanges[].address` | string | 受影响地址 |
| `balanceChanges[].asset` | string | 资产符号，目前仅 `"ETH"` |
| `balanceChanges[].before` | string | 变更前余额（已格式化） |
| `balanceChanges[].after` | string | 变更后余额（已格式化） |
| `tokenTransfers` | array | ERC-20/721/1155 转账记录 |
| `tokenTransfers[].token` | string | 代币符号，例如 `"USDC"` |
| `tokenTransfers[].tokenAddress` | string | 代币合约地址 |
| `tokenTransfers[].from` | string | 发送方 |
| `tokenTransfers[].to` | string | 接收方 |
| `tokenTransfers[].amount` | string | 已除以 decimals 的格式化金额 |

### 3.5 边界情况

| 场景 | 后端应返回 |
|---|---|
| 无任何状态变化（read-only 调用） | `balanceChanges: []`, `tokenTransfers: []` |
| 无可识别函数（全是低级 CALL） | `breakdown` 数组里用 `"Unknown"` 标识 |
| `optimizationSuggestions` 无内容 | 返回 `""`，不要省略字段 |

---

## 4. 接口 3：GET /api/security/:address

### 4.1 接口说明

对指定合约地址执行 Slither 静态分析，返回漏洞清单。
**负责后端工程师**：Position 3 — Security Analysis Engineer。
**数据来源**：Slither v0.10.0（或更新版本）`--json -` 输出，重新整形为以下结构。

### 4.2 请求

```
GET /api/security/0x7a250d5630b4cf539739df2c5dacb4c659f2488d
```

**路径参数**：

| 参数 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `:address` | string (0x + 40 hex) | 是 | 待扫描的合约地址 |

> **替代方案**：如果后端先做 POST 上传源码再扫描更方便，可以改为：
> ```
> POST /api/security/scan
> Content-Type: application/json
> { "source": "pragma solidity ^0.8.0; contract Foo { ... }" }
> ```
> 但需要提前**通知前端工程师**修改 `src/lib/api.ts`。默认按 GET 接口实现。

### 4.3 成功响应（200 OK）

```json
{
  "contractAddress": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  "contractName": "VulnerableVault",
  "scanStatus": "Completed",
  "toolsUsed": ["Slither v0.10.0"],
  "vulnerabilities": [
    {
      "id": "ERR-001",
      "type": "Reentrancy",
      "severity": "High",
      "line": 42,
      "description": "在 'withdrawFunds' 函数中检测到重入风险。状态变量在外部转账（CALL）之后才被修改，违反了检查-效果-交互（Checks-Effects-Interactions）模式。",
      "codeSnippet": "msg.sender.call{value: amount}(\"\"); balances[msg.sender] -= amount;"
    },
    {
      "id": "ERR-002",
      "type": "Access Control Bypass",
      "severity": "Medium",
      "line": 89,
      "description": "'emergencyDrain' 函数缺乏 'onlyOwner' 权限修饰符，允许任何人提取全额归集资金。",
      "codeSnippet": "function emergencyDrain() external { _transfer(msg.sender, address(this).balance); }"
    }
  ]
}
```

### 4.4 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `contractAddress` | string | 合约地址（回显） |
| `contractName` | string | 合约名（从 ABI/源码读取），无法识别时填 `"Unknown"` |
| `scanStatus` | `"Completed" \| "Failed" \| "Pending"` | 扫描状态 |
| `toolsUsed` | string[] | 工具列表，至少 `["Slither v0.10.0"]` |
| `vulnerabilities` | array | 漏洞清单，**按 severity 降序**（High → Medium → Low → Informational） |
| `vulnerabilities[].id` | string | 项目内唯一 ID，建议格式 `ERR-001`、`ERR-002` |
| `vulnerabilities[].type` | string | 漏洞类别，参考 [SWC 注册表](https://swcregistry.io/) 或 Slither check 名称 |
| `vulnerabilities[].severity` | `"High" \| "Medium" \| "Low" \| "Informational"` | 严重程度（首字母大写） |
| `vulnerabilities[].line` | number | 漏洞所在的源码行号，无法定位时填 `0` |
| `vulnerabilities[].description` | string | 详细描述，**可中文**，UTF-8 |
| `vulnerabilities[].codeSnippet` | string | 涉及的 Solidity 代码片段，原样保留缩进和换行 |

### 4.5 边界情况

| 场景 | 后端应返回 |
|---|---|
| 合约源码未在 Etherscan 公开 | `400`，错误说明源码不可用 |
| Slither 扫描中（异步任务） | `200`，`scanStatus: "Pending"`，`vulnerabilities: []` |
| Slither 崩溃 / solc 版本不匹配 | `200`，`scanStatus: "Failed"`，`vulnerabilities: []`，建议 `toolsUsed` 里加上错误信息 |
| 合约无任何漏洞 | `200`，`scanStatus: "Completed"`，`vulnerabilities: []` |
| 地址不是合约（是 EOA） | `400`，见 §5 |

---

## 5. 错误响应统一格式

所有 4xx / 5xx 响应都使用以下结构：

```json
{
  "error": "Transaction not found",
  "code": "TX_NOT_FOUND",
  "details": "No transaction matching 0x... on the connected RPC."
}
```

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `error` | string | 是 | 简短、面向用户的错误描述 |
| `code` | string | 否 | 机器可读错误代码（大写蛇形） |
| `details` | string | 否 | 调试用的详细信息 |

### 5.1 标准状态码用法

| 状态码 | 用法 |
|---|---|
| `400 Bad Request` | 请求参数格式错误（如 txHash 不是 0x + 64 hex） |
| `404 Not Found` | 资源不存在（交易/合约在链上找不到） |
| `429 Too Many Requests` | RPC 限流时返回 |
| `500 Internal Server Error` | 后端代码异常 |
| `503 Service Unavailable` | 上游 RPC / Slither 不可用 |
| `504 Gateway Timeout` | RPC 响应超时 |

前端的 `src/lib/api.ts` 会把所有非 2xx 当成 `Error` 抛出，SWR 将其映射到 `<ErrorState />` 组件上显示。

---

## 6. 性能与缓存预期

| 接口 | 期望 p50 | 期望 p95 | 备注 |
|---|---|---|---|
| `/api/trace/:txHash` | < 500ms | < 2s | RPC 限流时可能更高 |
| `/api/gas-state/:txHash` | < 600ms | < 2s | 如果与 trace 串行，应该共享缓存 |
| `/api/security/:address` | < 1s（已扫描） / 30s（首次） | < 60s | 首次扫描慢，建议异步 + 返回 `Pending` |

### 6.1 服务端缓存建议

- **trace** 与 **gas-state**：对同一 `txHash` 缓存 24h（交易数据不可变）
- **security**：对同一 `contractAddress` 缓存 1h（合约不会改，但扫描工具版本可能升级）

### 6.2 前端缓存策略

前端使用 SWR，对同一 key 自动去重；用户在同一会话内重复点击不会重发请求。

---

## 7. CORS 与本地联调

### 7.1 开发期 CORS 配置

前端运行在 `http://localhost:3000`，后端运行在 `http://localhost:8000`。
后端必须返回以下 CORS 头：

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

或者宽松配置（仅开发期）：

```
Access-Control-Allow-Origin: *
```

### 7.2 OPTIONS 预检请求

如果浏览器发起预检（preflight），后端必须正确响应 `OPTIONS` 请求，返回 `204` 或 `200` + 上述 CORS 头。

### 7.3 Python 后端示例（FastAPI）

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 7.4 Node.js 后端示例（Express）

```javascript
const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000" }));
```

---

## 8. 测试用例（必须通过）

以下命令必须在本地运行成功后，才能与前端联调（Day 4 之前）。

### 8.1 接口 1 测试

```bash
# 应返回 200 + JSON
curl -i http://localhost:8000/api/trace/0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026

# 应返回 400 + error JSON
curl -i http://localhost:8000/api/trace/invalid-hash

# 应返回 404 + error JSON
curl -i http://localhost:8000/api/trace/0x0000000000000000000000000000000000000000000000000000000000000000
```

### 8.2 接口 2 测试

```bash
curl -i http://localhost:8000/api/gas-state/0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026
```

预期：
- 状态码 200
- `gasProfiling.breakdown.percentage` 总和约等于 100（允许 ±1 浮点误差）
- `stateDiffs.balanceChanges[].before` 和 `after` 都是有效的字符串数字

### 8.3 接口 3 测试

```bash
curl -i http://localhost:8000/api/security/0x7a250d5630b4cf539739df2c5dacb4c659f2488d
```

预期：
- 状态码 200
- 至少 1 个 `vulnerabilities` 条目（用 SWC-107 重入合约测试）
- `severity` 字段值首字母大写

### 8.4 CORS 联调测试

前端开发服务器跑起来后，在浏览器 DevTools 的 Network 面板中点击任意请求，**Response Headers** 中应能看到 `Access-Control-Allow-Origin`。如果看到红色的 CORS 报错，说明 §7 没配置好。

### 8.5 JSON 字段对照测试

把后端返回的 JSON 与 `mock_data/*.json` 对比，**所有 key 必须一致**（含大小写）。建议用如下命令快速比对：

```bash
# 提取 key 路径
curl -s http://localhost:8000/api/trace/0x5c50... | jq 'paths | join(".")' | sort > backend_keys.txt
jq 'paths | join(".")' mock_data/trace_response.json | sort > mock_keys.txt
diff backend_keys.txt mock_keys.txt
# 期望：diff 输出为空
```

如果 diff 不为空，**必须**修改后端，不要修改 mock。

---

## 附录 A：样本测试数据

| 字段 | 值 |
|---|---|
| 测试 tx hash | `0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026` |
| 测试合约地址 | `0x7a250d5630b4cf539739df2c5dacb4c659f2488d` |
| 测试用户地址 | `0xda9dfa130df4de4673b89022ee50ff26f6ea73cf` |
| 网络 | Ethereum Mainnet（建议）或 Sepolia |

## 附录 B：建议的开发工作流

1. **本地起后端**（任何语言，FastAPI / Express / Hono 均可）
2. **复用 mock 数据**做单测：把 `mock_data/*.json` 当 fixture，确保 schema 一致
3. **接 RPC**：用 Alchemy / Infura 免费层（支持 `debug_traceTransaction`）
4. **本地集成测试**：起前端 + 后端，把 `frontend/.env.local` 改为 `NEXT_PUBLIC_USE_MOCKS=false`，访问 http://localhost:3000，确认三个标签数据加载正常

## 附录 C：变更记录

| 日期 | 变更 | 影响 |
|---|---|---|
| 初版 | 基于 `mock_data/*.json` 提取 | 锁定字段名 |
| —— | 后续如需新增字段，**必须先更新 mock**，再通知前端工程师更新 TypeScript 类型 | —— |

---

**联系方式**：如有疑问，发到团队群里 @前端工程师 + @后端集成工程师（Position 4）。
任何 schema 变更**都必须三方确认**（trace/gas/security 后端 + 前端）。
