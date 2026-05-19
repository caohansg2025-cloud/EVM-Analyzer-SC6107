import os
from web3 import Web3
from dotenv import load_dotenv


load_dotenv()
alchemy_rpc_url = os.getenv("ALCHEMY_RPC_URL")
w3 = Web3(Web3.HTTPProvider(alchemy_rpc_url))


def get_transaction(tx_hash):
    """ """
    return w3.eth.get_transaction(tx_hash)

def get_receipt(tx_hash):
    """ """
    return w3.eth.get_transaction_receipt(tx_hash)