from src.gas.analyzer import trace_gas_analyze
from src.state.analyzer import state_diffs


def summarize_trace(trace, receipt=None):
    call_tree = trace.get("result", {}).get("callTree")
    state_diff = trace.get("result", {}).get("stateDiff")
    summary = trace_gas_analyze(trace, receipt)
    summary["state_diffs"] = state_diffs(call_tree, receipt, state_diff)
    return summary

