from src.gas.parser import (
    gas_tree, gas_by_function, gas_by_opcode, _to_int
)


def gas_profiling(receipt, call_tree, struct_logs):
    """ gas profile """
    total_gas = _to_int(receipt.get("gasUsed")) if receipt else 0

    by_function_aggr = gas_by_function(call_tree)
    by_function_tree = gas_tree(call_tree)
    
    opcode_gas = gas_by_opcode(struct_logs)
    suggestion = _opcode_suggestion(opcode_gas)

    return {
        "totalGasUsed": total_gas,

        "gasByFunctionAggrData": by_function_aggr,
        "gasByFunctionTreeData": by_function_tree,

        "opcodeGasConsumption": opcode_gas,
        "optimizationSuggestions": suggestion
    }


def _opcode_suggestion(opcode_gas):
    if not opcode_gas:
        return "No opcode data available."
    top_opcode, _ = max(opcode_gas.items(), key=lambda item: item[1])
    if top_opcode in {"SSTORE", "SLOAD"}:
        return """
               Storage ops dominate gas usage. Consider caching and batching 
               writes.
               """
    if top_opcode in {"CALL", "DELEGATECALL", "STATICCALL"}:
        return """
               External calls dominate gas usage. Consider reducing 
               cross-contract calls.
               """
    return """
           Top gas opcode is %s. Review its usage for optimization.
           """ % top_opcode