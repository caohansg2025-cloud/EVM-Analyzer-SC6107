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

