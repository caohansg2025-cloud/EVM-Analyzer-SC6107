import os
import logging
from web3 import Web3
from dotenv import load_dotenv


load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)


alchemy_rpc_url = os.getenv("ALCHEMY_RPC_URL")
w3 = Web3(Web3.HTTPProvider(alchemy_rpc_url))


def get_transaction(tx_hash):
    """ """
    try:
        return w3.eth.get_transaction(tx_hash)
    except Exception as exc:
        logger.error("get_transaction failed for %s: %s", tx_hash, exc)
        raise

def get_receipt(tx_hash):
    """ """
    try:
        return w3.eth.get_transaction_receipt(tx_hash)
    except Exception as exc:
        logger.error("get_receipt failed for %s: %s", tx_hash, exc)
        raise