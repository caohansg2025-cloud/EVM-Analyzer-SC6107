from pydantic import BaseModel


class TxRequest(BaseModel):
    txHash: str

