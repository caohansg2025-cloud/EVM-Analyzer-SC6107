import os
from web3 import Web3
from dotenv import load_dotenv


load_dotenv()
quicknode_rpc_url = os.getenv("QUICKNODE_RPC_URL")

w3 = Web3(Web3.HTTPProvider(quicknode_rpc_url))


def trace_transaction(tx_hash):
    """ """
    return w3.provider.make_request(
        "debug_traceTransaction",
        [
            tx_hash,
            {
                "timeout": "30s"
            }
        ]
    )
