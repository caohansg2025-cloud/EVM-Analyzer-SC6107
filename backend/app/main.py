import sys
import os
import json
import logging
from pathlib import Path
from collections import OrderedDict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Standardize path loading
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)

# Load .env environment variables
for env_path in [backend_dir / ".env", backend_dir.parent / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        logger.info(f"Loaded .env from {env_path}")
        break
else:
    load_dotenv()

# Read config parameters
USE_MOCK = os.getenv("USE_MOCK", "True").lower() in ("true", "1", "yes")
logger.info(f"EVM Analyzer Backend Configuration: USE_MOCK={USE_MOCK}")

from src.api.tx import get_transaction, get_receipt
from src.api.trace import trace_transaction
from src.gas.analyzer import gas_profiling
from src.state.analyzer import state_diffs
from src.gas.parser import _function_label, _to_int
from src.api.dto import TxRequest
import security_scan

app = FastAPI(title="EVM Analyzer & Debugger Unified Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local dev integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_DATA_DIR = backend_dir.parent / "mock_data"

def load_mock_json(filename: str) -> dict:
    file_path = MOCK_DATA_DIR / filename
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Mock file not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"Mock file {filename} not found")
    except Exception as e:
        logger.error(f"Error reading mock file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading mock file: {e}")

# Cache for transaction details
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

KNOWN_CONTRACTS = {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
}

ADDRESS_TO_CONTRACT = {
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "test_contracts/VulnerableVault.sol",
    "0x1111111111111111111111111111111111111111": "test_contracts/AccessControlBug.sol",
    "0x2222222222222222222222222222222222222222": "test_contracts/UncheckedCall.sol",
    "0x3333333333333333333333333333333333333333": "test_contracts/OverflowToken.sol",
}

KNOWN_DECIMALS = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6,  # USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,  # USDT
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 18, # WETH
    "0x6b175474e89094c44da98b954eedeac495271d0f": 18, # DAI
}

def get_contract_display_name(address: str) -> str:
    if not address:
        return ""
    addr_lower = address.lower()
    if addr_lower in KNOWN_CONTRACTS:
        return KNOWN_CONTRACTS[addr_lower]
    if addr_lower in ADDRESS_TO_CONTRACT:
        sol_path = ADDRESS_TO_CONTRACT[addr_lower]
        return os.path.basename(sol_path).replace(".sol", "")
    return ""

def get_token_decimals(address: str) -> int:
    if not address:
        return 18
    addr_lower = address.lower()
    return KNOWN_DECIMALS.get(addr_lower, 18)

def convert_call_tree_to_trace_tree(call):
    if not call:
        return None
    value_wei = _to_int(call.get("value"))
    if value_wei > 0:
        value_str = f"{value_wei / 10**18:.4f}".rstrip('0').rstrip('.') + " ETH"
    else:
        value_str = "0 ETH"
    gas_used = _to_int(call.get("gasUsed"))
    func_name = _function_label(call)
    
    # ch：增加提取底层日志数据功能
    logs = call.get("logs", [])
    
    children = []
    for child in call.get("calls", []) or []:
        child_converted = convert_call_tree_to_trace_tree(child)
        if child_converted:
            children.append(child_converted)
            
    return {
        "type": call.get("type", "CALL"),
        "from": call.get("from"),
        "to": call.get("to"),
        "value": value_str,
        "gasUsed": gas_used,
        "functionName": func_name,
        "logs": logs,  
        "calls": children
    }

# --------------------------- API Endpoints ------------------------------------

@app.get("/api/trace/{tx_hash}")
def get_trace(tx_hash: str):
    clean_tx_hash = tx_hash.strip()
    logger.info(f"GET /api/trace/{clean_tx_hash} requested. USE_MOCK={USE_MOCK}")
    if USE_MOCK:
        data = load_mock_json("trace_response.json")
        data["txHash"] = clean_tx_hash
        return data
    try:
        cached = trace_cache.get(clean_tx_hash)
        if cached is None:
            tx = get_transaction(clean_tx_hash)
            receipt = get_receipt(clean_tx_hash)
            trace = trace_transaction(clean_tx_hash)
            cached = {"tx": tx, "receipt": receipt, "trace": trace}
            trace_cache.set(clean_tx_hash, cached)
        else:
            tx = cached["tx"]
            receipt = cached["receipt"]
            trace = cached["trace"]
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found on chain")
        if not receipt:
            raise HTTPException(status_code=404, detail="Transaction receipt not found on chain")
        call_tree = trace.get("callTree")
        trace_tree = convert_call_tree_to_trace_tree(call_tree)
        status = "Success" if receipt.get("status") == 1 else "Failed"
        return {
            "txHash": clean_tx_hash,
            "blockNumber": tx.get("blockNumber"),
            "from": tx.get("from"),
            "to": tx.get("to"),
            "status": status,
            "traceTree": trace_tree
        }
    except Exception as e:
        logger.error(f"Error fetching real trace for {clean_tx_hash}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/gas-state/{tx_hash}")
def get_gas_state(tx_hash: str):
    clean_tx_hash = tx_hash.strip()
    logger.info(f"GET /api/gas-state/{clean_tx_hash} requested. USE_MOCK={USE_MOCK}")
    if USE_MOCK:
        data = load_mock_json("gas_state_response.json")
        data["txHash"] = clean_tx_hash
        return data
    try:
        cached = trace_cache.get(clean_tx_hash)
        if cached is None:
            receipt = get_receipt(clean_tx_hash)
            trace = trace_transaction(clean_tx_hash)
            cached = {"receipt": receipt, "trace": trace}
            trace_cache.set(clean_tx_hash, cached)
        else:
            receipt = cached.get("receipt")
            trace = cached.get("trace")
        if not receipt:
            raise HTTPException(status_code=404, detail="Transaction receipt not found on chain")
        profiling_raw = gas_profiling(receipt, trace.get("callTree"), trace.get("structLogs"))
        state_diffs_raw = state_diffs(trace.get("callTree"), receipt, trace.get("stateDiff"))
        total_gas = profiling_raw["totalGasUsed"]
        breakdown = []
        for entry in profiling_raw["gasByFunctionAggrData"]:
            percentage = round((entry.gas_used / total_gas) * 100) if total_gas > 0 else 0
            contract_name = get_contract_display_name(entry.contract)
            func_display = f"{contract_name}.{entry.function}" if contract_name else entry.function
            breakdown.append({
                "function": func_display,
                "gas": entry.gas_used,
                "percentage": percentage
            })
        breakdown.sort(key=lambda x: x["percentage"], reverse=True)
        balance_changes = []
        for change in state_diffs_raw.get("balanceChanges", []):
            addr = change.get("address")
            before_wei = 0
            after_wei = 0
            if "before" in change and change["before"] is not None:
                before_wei = _to_int(change["before"])
            if "after" in change and change["after"] is not None:
                after_wei = _to_int(change["after"])
            if before_wei == 0 and after_wei == 0 and "deltaWei" in change:
                delta = int(change["deltaWei"])
                if delta >= 0:
                    after_wei = delta
                else:
                    before_wei = abs(delta)
            before_eth = f"{before_wei / 10**18:.6f}".rstrip('0').rstrip('.')
            after_eth = f"{after_wei / 10**18:.6f}".rstrip('0').rstrip('.')
            if not before_eth or before_eth == ".":
                before_eth = "0.0"
            if not after_eth or after_eth == ".":
                after_eth = "0.0"
            balance_changes.append({
                "address": addr,
                "asset": "ETH",
                "before": before_eth,
                "after": after_eth
            })
        token_transfers = []
        for transfer in state_diffs_raw.get("tokenTransfers", []):
            token_addr = transfer.get("tokenAddress")
            raw_amount = _to_int(transfer.get("amount", 0))
            decimals = get_token_decimals(token_addr)
            amount_val = raw_amount / (10**decimals)
            if amount_val.is_integer():
                amount_str = f"{int(amount_val)}"
            else:
                amount_str = f"{amount_val:.2f}"
            token_sym = get_contract_display_name(token_addr) or transfer.get("token", "ERC20")
            token_transfers.append({
                "token": token_sym,
                "tokenAddress": token_addr,
                "from": transfer.get("from"),
                "to": transfer.get("to"),
                "amount": amount_str
            })
        return {
            "txHash": clean_tx_hash,
            "gasProfiling": {
                "totalGasUsed": total_gas,
                "breakdown": breakdown,
                "optimizationSuggestions": profiling_raw.get("optimizationSuggestions", "")
            },
            "stateDiffs": {
                "balanceChanges": balance_changes,
                "tokenTransfers": token_transfers
            }
        }
    except Exception as e:
        logger.error(f"Error building real gas state for {clean_tx_hash}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/security/{address}")
def get_security_scan(address: str):
    clean_address = address.strip()
    logger.info(f"GET /api/security/{clean_address} requested. USE_MOCK={USE_MOCK}")
    if USE_MOCK:
        data = load_mock_json("security_response.json")
        data["contractAddress"] = clean_address
        return data
    sol_file = ADDRESS_TO_CONTRACT.get(clean_address.lower())
    if not sol_file:
        logger.warning(f"Address {clean_address} not in address map. Falling back to VulnerableVault.sol")
        sol_file = "test_contracts/VulnerableVault.sol"
    sol_path = backend_dir.parent / sol_file
    if not sol_path.exists():
        logger.error(f"Solidity contract not found at {sol_path}")
        raise HTTPException(status_code=404, detail="Solidity contract file not found")
    try:
        report = security_scan.build_report(sol_path)
        report["contractAddress"] = clean_address
        return report
    except Exception as e:
        logger.error(f"Error compiling / scanning contract {sol_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Scanner execution failed: {e}")

# --------------------------- Compatibility POST Endpoints -------------------------

@app.post("/api/trace")
def trace_tx_post(req: TxRequest):
    return get_trace(req.txHash)

@app.post("/api/tx_gas")
def tx_gas_post(req: TxRequest):
    if USE_MOCK:
        mock_data = load_mock_json("gas_state_response.json")
        return mock_data["gasProfiling"]
    clean_tx_hash = req.txHash.strip()
    try:
        cached = trace_cache.get(clean_tx_hash)
        if cached is None:
            receipt = get_receipt(clean_tx_hash)
            trace = trace_transaction(clean_tx_hash)
            cached = {"receipt": receipt, "trace": trace}
            trace_cache.set(clean_tx_hash, cached)
        else:
            receipt = cached.get("receipt")
            trace = cached.get("trace")
        return gas_profiling(receipt, trace.get("callTree"), trace.get("structLogs"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stat_diff")
def stat_diff_post(req: TxRequest):
    if USE_MOCK:
        mock_data = load_mock_json("gas_state_response.json")
        return mock_data["stateDiffs"]
    clean_tx_hash = req.txHash.strip()
    try:
        cached = trace_cache.get(clean_tx_hash)
        if cached is None:
            receipt = get_receipt(clean_tx_hash)
            trace = trace_transaction(clean_tx_hash)
            cached = {"receipt": receipt, "trace": trace}
            trace_cache.set(clean_tx_hash, cached)
        else:
            receipt = cached.get("receipt")
            trace = cached.get("trace")
        return state_diffs(trace.get("callTree"), receipt, trace.get("stateDiff"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 系统监控
@app.get("/api/system/health")
def get_system_health():
    """系统健康度与LRU 缓存命中"""
    return {
        "status": "Running",
        "engineMode": "Mock (Local Data)" if USE_MOCK else "Production (Real RPC)",
        "cacheMetrics": {
            "capacity": trace_cache.capacity,
            "currentUsage": len(trace_cache._store),
            "utilizationRate": f"{(len(trace_cache._store) / trace_cache.capacity) * 100:.2f}%"
        },
        "supportedTokens": list(KNOWN_CONTRACTS.values()),
        "vulnerabilityContractsMapped": len(ADDRESS_TO_CONTRACT)
    }