import os
import logging 
from fastapi import HTTPException
from web3 import Web3
from web3.types import RPCEndpoint
from dotenv import load_dotenv

from src.api.helper import norm_hash


load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)


quicknode_rpc_url = os.getenv("QUICKNODE_RPC_URL")
w3 = Web3(Web3.HTTPProvider(quicknode_rpc_url))


def trace_transaction(tx_hash: str):
    """
    Fetch both structLogs and call tree traces for gas analysis.
    """
    tx_hash = norm_hash(tx_hash)
    struct_trace_payload = {
        "timeout": "30s"
    }
    struct_trace = w3.provider.make_request(
        RPCEndpoint("debug_traceTransaction"),
        [tx_hash, struct_trace_payload]
    )
    call_trace_payload = {
        "timeout": "30s",
        "tracer": "callTracer"
    }
    call_trace = w3.provider.make_request(
        RPCEndpoint("debug_traceTransaction"),
        [tx_hash, call_trace_payload]
    )
    state_diff_trace_payload = {
        "timeout": "30s",
        "tracer": "stateDiffTracer"
    }
    state_diff_trace = w3.provider.make_request(
        RPCEndpoint("debug_traceTransaction"),
        [tx_hash, state_diff_trace_payload]
    )
    if struct_trace.get("error"):
        logger.error("Struct trace error for %s: %s", tx_hash, struct_trace.get("error"))
    if call_trace.get("error"):
        logger.error("Call trace error for %s: %s", tx_hash, call_trace.get("error"))
    if state_diff_trace.get("error"):
        logger.error("State diff trace error for %s: %s", tx_hash, state_diff_trace.get("error"))
    return {
        "structLogs": struct_trace.get("result", {}).get("structLogs", []),
        "callTree": call_trace.get("result"),
        "stateDiff": state_diff_trace.get("result")
    }
