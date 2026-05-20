import os
from web3 import Web3
from dotenv import load_dotenv


load_dotenv()
quicknode_rpc_url = os.getenv("QUICKNODE_RPC_URL")
w3 = Web3(Web3.HTTPProvider(quicknode_rpc_url))


def trace_transaction(tx_hash):
    """Fetch both structLogs and call tree traces for gas analysis."""
    struct_trace = w3.provider.make_request(
        "debug_traceTransaction",
        [
            tx_hash,
            {
                "timeout": "30s"
            }
        ]
    )
    call_trace = w3.provider.make_request(
        "debug_traceTransaction",
        [
            tx_hash,
            {
                "timeout": "30s",
                "tracer": "callTracer"
            }
        ]
    )
    state_diff_trace = w3.provider.make_request(
        "debug_traceTransaction",
        [
            tx_hash,
            {
                "timeout": "30s",
                "tracer": "stateDiffTracer"
            }
        ]
    )
    return {
        "result": {
            "structLogs": struct_trace.get("result", {}).get("structLogs", []),
            "callTree": call_trace.get("result"),
            "stateDiff": state_diff_trace.get("result")
        },
        "errors": {
            "struct": struct_trace.get("error"),
            "call": call_trace.get("error"),
            "state": state_diff_trace.get("error")
        }
    }
