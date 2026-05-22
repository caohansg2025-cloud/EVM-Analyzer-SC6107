# 前端测试指南

> **面向对象**：团队成员（不限角色）、TA、外部评审
> **测试环境**：Windows / macOS / Linux
> **预计耗时**：首次 ~10 分钟（含 npm install），二次 < 2 分钟
> **前置要求**：仅需 Node.js LTS

本文档让任何人都能在不改动代码的情况下，从零启动并验证前端工程。如果你卡住了，先看 §6 "常见问题"。

---

## 1. 准备环境

### 1.1 安装 Node.js（一次性）

如果还没安装：

1. 打开 https://nodejs.org/
2. 下载 **LTS 版本**（推荐 22.x 或以上）
3. 双击安装包，全程默认即可
4. **关闭并重新打开** PowerShell / 终端（让 PATH 生效）

验证：

```powershell
node --version
npm --version
```

预期输出（版本号可能更高）：

```
v22.11.0
10.9.0
```

如果命令找不到，**请重启电脑**或确认安装时勾选了 "Add to PATH"。

### 1.2 获取代码

```powershell
# 如果是从 GitHub clone
git clone https://github.com/<your-org>/EVM-Analyzer-SC6107-main.git
cd EVM-Analyzer-SC6107-main

# 如果是本地副本，直接 cd 到项目根目录即可
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main
```

---

## 2. 一键启动（首次）

```powershell
cd frontend
npm install
```

**预期**：
- 大约持续 1–3 分钟（取决于网速）
- 末尾出现 `added 428 packages` 之类
- 可能有 `4 moderate severity vulnerabilities` 警告 —— 这是间接依赖项，不影响使用
- 退出码 0

如果失败，跳到 §6。

接着：

```powershell
# 复制环境变量模板
copy .env.example .env.local

# 启动开发服务器
npm run dev
```

**预期输出**（前几行）：

```
▲ Next.js 16.2.6 (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready in <1000ms
```

打开浏览器访问 **http://localhost:3000**。

---

## 3. 你应该看到什么

按从上到下顺序检查：

### 3.1 顶部导航栏（Header）

```
┌──────────────────────────────────────────────────────────┐
│ ⚙️ EVM Analyzer   SC6107 · Project 7    [Connect Wallet] │
└──────────────────────────────────────────────────────────┘
```

- 左侧：齿轮表情 + 应用名 + 副标题（在窄屏会隐藏副标题）
- 右侧："Connect Wallet" 按钮（**Phase 1 不可点**，只是占位）
- 整体背景是**深色**（dark mode）

### 3.2 搜索输入框

```
┌──────────────────────────────────────────────────────────┐
│ Paste tx hash or pick a sample (coming in Commit 14)     │
└──────────────────────────────────────────────────────────┘
```

- 灰色占位文字
- 输入框处于 **disabled** 状态（无法输入）
- 这是 Phase 1 的预期行为，Phase 4 (Commit 14) 才会启用

### 3.3 三个标签页

```
┌─────────┬──────────────┬──────────┐
│  Trace  │ Gas & State  │ Security │
└─────────┴──────────────┴──────────┘
```

依次点击三个标签，内容区应该切换显示：

| 标签页 | 内容区文字 |
|---|---|
| Trace | `Trace view — coming in Commit 9` |
| Gas & State | `Gas & State view — coming in Commit 12` |
| Security | `Security view — coming in Commit 13` |

文字颜色应该是灰色（muted），居中显示。

### 3.4 浏览器控制台（DevTools）

按 **F12** 打开开发者工具 → **Console** 标签。

预期：**没有红色错误**。允许的内容：
- 一两条信息（黑色或灰色字）说明 React DevTools / Fast Refresh
- ⚠️ Recharts / Next.js 的弃用警告

如果有**红色**报错，请把截图发给我（前端工程师），并附上 §4 的输出。

---

## 4. 完整自动化验证

如果你想用一条命令验证全部（推荐给 CI 或快速排错）：

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npx tsc --noEmit          # TypeScript 类型检查
npm run lint              # 代码风格检查
npm run build             # 生产构建
```

预期：三条命令全部退出码 0。

| 命令 | 耗时 | 通过的标志 |
|---|---|---|
| `npx tsc --noEmit` | < 10s | 命令执行完无报错，命令提示符返回 |
| `npm run lint` | < 5s | 看到 `> eslint`，之后无输出 |
| `npm run build` | ~10s | 末尾出现 `Route (app)` 表格，显示 `○ /` 和 `○ /_not-found` |

可以用 `$LASTEXITCODE`（PowerShell）或 `echo $?`（bash）查看上一条命令的退出码。

---

## 5. 关停服务器

在运行 `npm run dev` 的 PowerShell 窗口里按 **Ctrl + C**。

如果它没退干净（端口仍被占用）：

```powershell
# Windows: 查找占用 3000 端口的进程
netstat -ano | findstr :3000
# 然后用 taskkill /PID <PID> /F
```

---

## 6. 常见问题（FAQ）

### 6.1 `node : 无法识别的命令`

Node 没装好，或 PATH 没生效。

**解决**：重启 PowerShell（最简单）。如果不行，重新运行 Node 安装包并确保勾选 "Add to PATH"。

### 6.2 `npm warn Unknown user config "\node js\node_global"`

旧版 Node 残留的 `.npmrc` 配置。**无害，可忽略**。

如果想消除警告：

```powershell
npm config delete prefix
npm config delete cache
```

### 6.3 `npx tsc` 提示 "This is not the tsc command you are looking for"

你在错误的目录运行。**所有 npm/npx 命令必须在 `frontend/` 子目录运行，不能在项目根目录**。

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
# 然后再运行 npx tsc --noEmit
```

### 6.4 `Error: Port 3000 is already in use`

3000 端口被占用。两种解法：

**A. 用别的端口**：

```powershell
$env:PORT = "3001"
npm run dev
```

然后访问 http://localhost:3001

**B. 杀掉占用 3000 的进程**：

```powershell
netstat -ano | findstr :3000
taskkill /PID <上一步看到的 PID> /F
```

### 6.5 `npm install` 卡住或失败

最常见是网络问题（npm 默认从美国镜像拉包）。换国内镜像：

```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

完事后可以改回：

```powershell
npm config set registry https://registry.npmjs.org
```

### 6.6 页面打开后是空白 / 纯白

打开 DevTools (F12) → Console → 截图错误。常见原因：
- 浏览器有插件干扰（试试无痕模式）
- 缓存问题（Ctrl+Shift+R 强制刷新）

### 6.7 `Slow filesystem detected` 警告

```
⚠ Slow filesystem detected. The benchmark took 700ms...
```

Next.js 检测到磁盘 I/O 慢，可能是因为代码放在 D 盘机械硬盘或网络驱动器。**不影响功能**，只是开发期热重载会稍慢。

### 6.8 一切看起来正常，但功能为空

**这是 Phase 1 的预期状态**。当前只完成了脚手架 + 类型定义 + 应用外壳。真正的功能（调用栈、Gas 图表、漏洞报告）会在 Phase 2-4 (Commit 6-18) 逐步实现。

如果想测试有数据的版本，等前端工程师推送 Phase 2 的 Commit 9（Trace 标签）。

---

## 7. 给前端工程师反馈

如果你在测试中发现问题，请提供以下信息：

1. **你执行了什么命令**（完整复制粘贴）
2. **你看到什么输出**（截图或文字）
3. **你的环境**：
   ```powershell
   node --version
   npm --version
   # Windows 版本：winver
   ```
4. **浏览器**：Chrome 130 / Edge / Firefox ?
5. **是否首次安装** vs 重新启动

发到团队群里 @前端工程师 即可。

---

## 8. 验证通过的标准（Phase 1 收货标准）

只要以下都成立，Phase 1 就是合格的：

```
[ ] npm install 成功，无 ERROR
[ ] npm run dev 成功，输出 "Ready in ..."
[ ] 浏览器访问 http://localhost:3000 显示页面
[ ] 看到 "⚙️ EVM Analyzer · SC6107 · Project 7" 标题
[ ] 看到 "Connect Wallet" 按钮
[ ] 看到三个可切换的标签
[ ] DevTools Console 没有红色错误
[ ] npx tsc --noEmit 退出码 0
[ ] npm run lint 退出码 0
[ ] npm run build 成功，生成 4 个静态页面
```

10 项全部勾选 = Phase 1 通过。

---

## 附录 A：完整命令速查

```powershell
# 一次性
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
npm install
copy .env.example .env.local

# 每次开发
npm run dev                  # 启动开发服务器
# Ctrl+C 退出

# 验证（CI 用）
npx tsc --noEmit             # 类型检查
npm run lint                 # 代码风格
npm run build                # 生产构建
npm run start                # 跑构建产物（测试 prod 行为）
```

## 附录 B：项目目录速览

```
frontend/
├── src/
│   ├── app/             # Next.js 应用入口（layout, page, globals.css）
│   ├── components/      # React 组件
│   │   ├── ui/          # shadcn/ui 原生组件（不要改）
│   │   ├── header/      # 顶部导航
│   │   └── input/       # 搜索框
│   ├── hooks/           # SWR 数据钩子
│   ├── lib/             # 工具函数 + API 客户端
│   ├── types/           # TypeScript 类型定义
│   └── mocks/           # 测试数据（来自 mock_data/）
├── .env.local           # 本地环境变量（git 忽略）
├── .env.example         # 模板（提交）
├── package.json         # 依赖清单
└── next.config.ts       # Next.js 配置
```

文档结束。如需更深入的代码说明，参考 [docs/frontend-verification.md](frontend-verification.md) 和 [docs/frontend-design.md](frontend-design.md)。
