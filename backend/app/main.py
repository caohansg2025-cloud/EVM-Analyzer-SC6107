# basic imports
from collections import OrderedDict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# api
from src.api.dto import (
    TxRequest
)
from src.api.tx import (
    get_transaction,
    get_receipt
)
from src.api.trace import (
    trace_transaction
)
# gas and state feature imports
from src.gas.analyzer import (
    gas_profiling
)
from src.state.analyzer import (
    state_diffs
)

# ------------------------ app: init and config --------------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LRUCache:
    def __init__(self, capacity=128):
        self.capacity = capacity
        self._store = OrderedDict()

    def get(self, key):
        if key not in self._store:
            return None
        self._store.move_to_end(key)
        return self._store[key]

    def set(self, key, value):
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = value
        if len(self._store) > self.capacity:
            self._store.popitem(last=False)


trace_cache = LRUCache(capacity=256)

# --------------------------- api endpoints ------------------------------------

@app.post("/api/trace")
def trace_tx(req: TxRequest):
    """ api for fetching tx and its trace """


@app.post("/api/tx_gas")
def tx_gas(req: TxRequest):
    tx_hash = req.txHash
    receipt = get_receipt(tx_hash)
    cached = trace_cache.get(tx_hash)
    if cached is None:
        trace = trace_transaction(tx_hash)
        trace_cache.set(tx_hash, trace)
        cached = trace
    return gas_profiling(receipt, cached["callTree"], cached["structLogs"])

@app.post("/api/stat_diff")
def stat_diff(req: TxRequest):
    tx_hash = req.txHash
    receipt = get_receipt(tx_hash)
    cached = trace_cache.get(tx_hash)
    if cached is None:
        trace = trace_transaction(tx_hash)
        trace_cache.set(tx_hash, trace)
        cached = trace
    return state_diffs(cached["callTree"], receipt, cached["stateDiff"])