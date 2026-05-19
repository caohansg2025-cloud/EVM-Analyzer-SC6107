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


