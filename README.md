# EVM Transaction Debugger & Analyzer (Option 7)

## 目录结构说明
请每位组员对号入座，严格在指定的文件夹内开发，避免产生代码合并冲突（Merge Conflicts）：

* **`frontend/` (4号位 - 前端工程师)**
    * **职责**：基于 React/Next.js 搭建 UI 界面与数据可视化看板。
    * **注意**：在后端真实 API 完工前，请直接引入 `mock_data/` 中的 JSON 文件作为静态数据进行界面渲染与联调。
* **`backend/` (1, 2, 3号位 - 后端与安全工程师)**
    * **职责**：存放所有 Python/Node.js 数据解析与处理脚本。
    * 1号位：负责交易追踪解析（Trace Tree 提取）。
    * 2号位：负责 Gas 消耗统计与状态差异（State Diff）字典生成。
    * 3号位：负责调用安全工具扫描逻辑。
* **`mock_data/` (前后端交互)**
    * **职责**：存放系统唯一的 **API 数据契约（Schema）**。
    * 包含：`trace_response.json`（1号标准）、`gas_state_response.json`（2号标准）、`security_response.json`（3号标准）。
    * **铁律**：后端脚本输出的 JSON 键名（Key）和层级必须与此目录下的文件 100% 一致。
* **`test_contracts/` (3号位 - 安全工程师)**
    * **职责**：存放用于安全漏洞扫描测试的智能合约（靶场案例，如包含 Reentrancy 等漏洞的合约）。
* **`docs/` (5号位 - 架构师与交付经理)**
    * **职责**：存放系统架构设计说明（`architecture.md`）、技术文档以及最终演示 PPT / 视频链接。

---

##  Git 协作规则
1.  **【禁止直推】** 任何情况下，**严禁**直接 `git push` 到 `main` 分支。`main` 分支已被锁死，仅用于最终交付。
2.  **【分支隔离】** 每个人必须在自己的本地 Feature 分支干活，分支命名规范：
    * 1号位：`feature/trace-api`
    * 2号位：`feature/gas-profile`
    * 3号位：`feature/security-scan`
    * 4号位：`feature/frontend-ui`
    * 5号位：`docs/architecture-ppt`
3.  **【原子提交】** 保持 **每日 Commit** 的好习惯。每次提交的日志请语义化，例如：`feat: 增加 Trace 十六进制转十进制递归函数` 或 `fix: 修复饼图组件在零数据下的红屏 Bug`。
4.  **【合并流程】** 本地开发测试无误后，将分支推送到 GitHub，并发起 **Pull Request (PR)**。由项目经理（5号位）进行 Code Review 后统一合并入主分支。

---

## How to Run

### 环境前置

**Python 后端**
- Python ≥ 3.10
- [`uv`](https://docs.astral.sh/uv/) — 项目依赖管理器
- 仓库根目录执行一次：
  ```bash
  uv sync
  ```
  这会在 `.venv/` 内安装 `pyproject.toml` 声明的所有依赖。

**Node 前端**
- Node ≥ 20
- 进入 `frontend/` 执行一次：
  ```bash
  cd frontend && npm install
  ```

**环境变量**
- 后端可选 `.env`（项目根或 `backend/`）：
  - `USE_MOCK=true|false`（默认 `true`，读取 `mock_data/*.json`；设为 `false` 走真实 RPC）
  - `ALCHEMY_RPC_URL=...`（`USE_MOCK=false` 时必填）
- 前端 `frontend/.env.local`：
  - `NEXT_PUBLIC_USE_MOCKS=false`（走后端 API，前端纯静态 mock 时改为 `true`）
  - `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`

---

### 整体启动（前后端连通）

两个终端分别启动：

```bash
# Terminal 1 — 后端 FastAPI（默认 mock 模式）
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — 前端 Next.js
cd frontend && npm run dev
```

访问 [http://127.0.0.1:3000](http://127.0.0.1:3000) 即可。后端 Swagger 文档在 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)。

统一后端暴露三个接口供前端调用：

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/trace/{txHash}` | 交易调用树 |
| GET | `/api/gas-state/{txHash}` | Gas profiling + state diff（合并接口） |
| GET | `/api/security/{address}` | Slither 漏洞扫描 |

> Tip：若改动了前端 client component 但页面没生效，可清掉 `frontend/.next/` 再重启 `npm run dev`，避免 turbopack 残留旧 chunk 导致 hydration 失败。

---

### 一键启动器（可选 / Launcher）

仓库根目录的 `start.bat` / `start.ps1` / `start.sh` 把上面的"两个终端"步骤合并成一条命令。它做的事情和你手动一行行敲完全一样 —— 同样的 uvicorn 命令，同样的 `npm run dev`，同样的端口（8000 / 3000）—— 所以**用不用启动器都能跑起来同一个 app**。差别只是有没有人帮你新开窗口、轮询就绪、打开浏览器。

**Windows（最简单 / Easiest）**

在文件资源管理器里**双击 `start.bat`**。它会做这些事：

1. 检查 `uv` / `npm` / `.venv/` / `node_modules/` 是否就绪（缺则提示先跑 `setup.ps1`）
2. 检查端口 3000、8000 是否空闲
3. **新开两个 PowerShell 窗口**：一个跑 `uv run uvicorn backend.app.main:app ...`，一个跑 `npm run dev`
4. 轮询两个服务直到响应（后端 30s 超时，前端 120s 超时）
5. **自动在默认浏览器打开 http://localhost:3000**

或者直接在 PowerShell 里：

```powershell
.\start.ps1
```

可选参数：

| Flag | 作用 |
| --- | --- |
| `-NoBrowser` | 不自动打开浏览器 |
| `-NoBackend` | 只启前端（适合纯前端 mock 演示） |
| `-NoFrontend` | 只启后端 |
| `-FrontendPort 3001` | 改前端端口 |
| `-BackendPort 8001` | 改后端端口 |

**macOS / Linux / Git Bash**

```bash
chmod +x start.sh
./start.sh
```

`start.sh` 自动检测终端模拟器（`osascript` / `gnome-terminal` / `konsole` / `kitty` / `xterm`），无头环境下退化为后台进程 + 日志文件。同样支持 `--no-browser` / `--no-backend` / `--no-frontend` / `--frontend-port` / `--backend-port` 参数。

**关闭服务**：直接关掉两个新开的终端窗口即可（或在每个窗口里按 `Ctrl+C`）。启动器本身的窗口可以随时关闭，不影响服务运行。

**等价的手动命令**（启动器内部就是这两行）：

```bash
# Terminal 1
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2
cd frontend && npm run dev
```

两条路径产出的 app 完全一致；启动器只是节省 ~3 次复制粘贴 + 自动打开浏览器。

---

### 单模块运行

#### Security Scan

模块详细文档：[`docs/security-analysis.md`](docs/security-analysis.md)

首次配置（安装合约对应的 `solc` 版本）：

```bash
uv run solc-select install 0.8.20
uv run solc-select install 0.7.6
```

扫描器会根据合约的 `pragma solidity` 自动切换到对应版本，无需手动 `solc-select use`。

运行扫描（输出 JSON 到 stdout）：

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty
```

常用选项：

| 命令 | 作用 |
| --- | --- |
| `--pretty` | 缩进美化 JSON。 |
| `--output PATH` | 同时把 JSON 写入文件。 |
| `--solc-version X.Y.Z` | 强制指定 solc 版本（覆盖 pragma 自动检测）。 |

批量扫描全部 fixture：

```bash
for f in test_contracts/*.sol; do
  echo "=== $f ==="
  uv run python backend/security_scan.py "$f" --pretty
done
```

退出码：`0` 成功（含 `CompletedWithNoFindings`）；`1` 扫描失败（JSON 中带 `error` 字段）；`2` 命令行误用。

#### Trace API

独立运行（旧版单模块入口，便于单测 trace 链路）：

```bash
uv run uvicorn backend.trace_api:app --host 127.0.0.1 --port 8000 --reload
```

接口：`POST /api/trace`，body `{ "txHash": "0x..." }`。受 `USE_MOCK` 控制走 mock 或真实 RPC。

#### Gas Profile / State Diff

Gas 与 State Diff 已并入统一后端（见上方整体启动）。如需单独跑解析器：

```bash
uv run python -c "from backend.src.gas.analyzer import gas_profiling; print(gas_profiling.__doc__)"
```

测试数据见 `mock_data/gas_state_response.json`。

#### Frontend UI

```bash
cd frontend
npm run dev      # 开发模式 http://127.0.0.1:3000
npm run build    # 生产构建
npm run start    # 起生产服务
npm run lint
```

将 `frontend/.env.local` 中的 `NEXT_PUBLIC_USE_MOCKS` 设为 `true` 可脱离后端，仅用 `frontend/src/mocks/*.json` 渲染整套界面。

---

### 单元测试

```bash
uv run pytest
```

`backend/tests/` 下覆盖 Trace API 的契约测试，运行前确保已执行 `uv sync`（含 dev 组依赖 `pytest`、`httpx`）。

