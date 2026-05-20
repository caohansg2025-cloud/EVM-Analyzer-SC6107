from src.gas.parser import (
    gas_tree, gas_by_function, gas_by_opcode, _to_int
)


def gas_profiling(call_tree, receipt, opcode_gas):
    """ gas profile """
    total_gas = _to_int(receipt.get("gasUsed")) if receipt else 0
    by_function = gas_by_function(call_tree)
    breakdown = []

    for entry in by_function:
        percentage = 0
        if total_gas > 0:
            percentage = round((entry["gas_used"] / total_gas) * 100, 2)
        breakdown.append({
            "function": entry["function"],
            "contract": entry["contract"],
            "callType": entry["call_type"],
            "gas": entry["gas_used"],
            "percentage": percentage
        })

    suggestion = _opcode_suggestion(opcode_gas)

    return {
        "totalGasUsed": total_gas,
        "breakdown": breakdown,
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


def trace_gas_analyze(trace, receipt=None):
    struct_logs = trace.get("result", {}).get("structLogs", [])
    call_tree = trace.get("result", {}).get("callTree")
    opcode_gas = gas_by_opcode(trace)
    return {
        "total_ops": len(struct_logs),
        "gas_by_opcode": opcode_gas,
        "gas_by_function": gas_by_function(call_tree),
        "gas_profiling": gas_profiling(call_tree, receipt, opcode_gas),
    }



