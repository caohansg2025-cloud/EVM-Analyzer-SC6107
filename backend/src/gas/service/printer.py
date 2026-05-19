def gas_by_opcode(trace):
    gas_map = {}

    struct_logs = trace.get("result", {}).get("structLogs", [])

    for log in struct_logs:
        op = log.get("op")
        gas_cost = log.get("gasCost", 0)

        gas_map[op] = gas_map.get(op, 0) + gas_cost

    return gas_map


def summarize_trace(trace):
    struct_logs = trace.get("result", {}).get("structLogs", [])

    return {
        "total_ops": len(struct_logs),
        "gas_by_opcode": gas_by_opcode(trace),
    }

