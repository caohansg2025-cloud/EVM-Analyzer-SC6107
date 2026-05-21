import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from eth_utils import keccak


load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)


ETHERSCAN_API_URL = os.getenv("ETHERSCAN_API_URL", "https://api.etherscan.io/api")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")


def _normalize_address(address: Optional[str]) -> str:
    if not isinstance(address, str):
        return ""
    return address.strip().lower()


@lru_cache(maxsize=1024)
def fetch_contract_abi(address: Optional[str]) -> List[Dict[str, Any]]:
    address = _normalize_address(address)
    if not address:
        return []
    if not ETHERSCAN_API_KEY:
        logger.warning("ETHERSCAN_API_KEY not set; cannot fetch ABI for %s", address)
        return []
    try:
        response = requests.get(
            ETHERSCAN_API_URL,
            params={
                "module": "contract",
                "action": "getabi",
                "address": address,
                "apikey": ETHERSCAN_API_KEY
            },
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("ABI fetch failed for %s: %s", address, exc)
        return []
    try:
        payload = response.json()
    except ValueError as exc:
        logger.error("ABI response not JSON for %s: %s", address, exc)
        return []
    if payload.get("status") != "1":
        logger.warning("ABI fetch unsuccessful for %s: %s", address, payload.get("result"))
        return []
    result = payload.get("result", "[]")
    try:
        return json.loads(result)
    except json.JSONDecodeError as exc:
        logger.error("ABI decode failed for %s: %s", address, exc)
        return []


def build_selector_map(abi: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Build mapping:
        0xa9059cbb -> transfer(address,uint256)
    """
    selectors: Dict[str, str] = {}
    for item in abi:
        if item.get("type") != "function":
            continue
        name = item.get("name")
        inputs = ",".join(i.get("type") for i in item.get("inputs", []))
        signature = f"{name}({inputs})"
        selector = keccak(text=signature)[:4].hex()
        selectors["0x" + selector] = signature
    return selectors


@lru_cache(maxsize=2048)
def get_selector_map(address: Optional[str]) -> Dict[str, str]:
    abi = fetch_contract_abi(address)
    if not abi:
        return {}
    return build_selector_map(abi)


def get_function_signature(address: Optional[str], selector: str) -> Optional[str]:
    address = _normalize_address(address)
    if not address or not isinstance(selector, str):
        return None
    selector_map = get_selector_map(address)
    return selector_map.get(selector.lower())