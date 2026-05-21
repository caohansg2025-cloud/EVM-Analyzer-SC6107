### Job description

1. 交易执行追踪工程师 (Transaction Trace Engineer)
负责模块： 交易追踪分析 (Transaction Trace Analysis) 。
工作职责：
- 调用以太坊节点 RPC（如 debug_traceTransaction）。
- 解析底层十六进制数据，提取完整的内部交易 (Internal transactions) 和调用栈 (Call stack)。
- 解析并提取事件日志 (Event logs) 。
独立交付物： 一个 Python/Node.js 脚本或 API 接口，输入为 TxHash，输出为标准 JSON 格式的调用栈树状数据。

2. 状态变更与 Gas 分析工程师 (State & Gas Profiling Engineer)
负责模块： Gas 分析 (Gas Profiling) 与状态差异可视化 (State Diff Visualization) 。
工作职责：
- 统计交易中各函数的 Gas 消耗明细，定位高消耗操作 。
- 解析交易前后的全局状态变化，包括地址余额变更和代币 (ERC-20/721/1155) 转移记录 。
独立交付物： 提供 JSON 格式的 Gas 消耗统计报表数据，以及状态变更前后的对比数据字典。


### The gas module should answer

- Where did the gas go?
- Which functions/contracts are expensive?
- Which opcodes are the worst offenders?
- How can the developer reduce gas?
- How does this tx compare to previous ones?

### Impl steps

- Trace retrieval (debug_traceTransaction)
- Trace → call tree parser
- Gas accounting engine
- Aggregation (function/opcode/contract)
- Pattern detection rules
- Optimization suggestions
- Historical database
- Visualization layer


