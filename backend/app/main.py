# basic imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# gas feature imports
from src.gas.api.tx import (
    get_transaction,
    get_receipt,
)
from src.gas.api.trace import (
    trace_transaction
)
from src.gas.dto.all import (
    TxRequest
)
from src.gas.service.printer import (
    gas_by_opcode,
    summarize_trace
)


# app: init and config 
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


# api endpoints
@app.post("/trace")
def trace_tx(req: TxRequest):
    """ api for fetching tx and its trace """
    print("--- backend api trace called ---")
    tx_hash = req.txHash

    print("fetching tx: " + tx_hash + " ...")
    tx = get_transaction(tx_hash)
    receipt = get_receipt(tx_hash)
    print("end of fetching tx")
    
    print("requesting trace...")
    trace = trace_transaction(tx_hash)

    print("trace received")

    summary = summarize_trace(trace)
    print("summary:", summary)

    return {
        "tx": dict(tx),
        "receipt": dict(receipt),
        "trace": trace,
        "summary": summary
    }