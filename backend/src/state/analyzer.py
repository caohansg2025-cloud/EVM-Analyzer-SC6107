def state_diffs(call_tree, receipt, state_diff=None):
    """Build state diffs for balances, tokens, and storage."""
    storage_changes = _storage_changes_from_state_diff(state_diff)
    balance_changes = _balance_changes_from_state_diff(state_diff)
    if not balance_changes:
        balance_changes = _eth_balance_changes(call_tree)
    token_transfers = _token_transfers_from_receipt(receipt)
    return {
        "balanceChanges": balance_changes,
        "tokenTransfers": token_transfers,
        "storageChanges": storage_changes
    }

def _storage_changes_from_state_diff(state_diff):
    if not state_diff:
        return []

    changes = []
    for address, account in state_diff.items():
        if not isinstance(account, dict):
            continue
        storage = account.get("storage") or {}
        if not isinstance(storage, dict):
            continue
        for slot, delta in storage.items():
            before, after = _diff_from_delta(delta)
            changes.append({
                "address": address,
                "slot": slot,
                "before": before,
                "after": after
            })
    return changes

def _balance_changes_from_state_diff(state_diff):
    if not state_diff:
        return []

    changes = []
    for address, account in state_diff.items():
        if not isinstance(account, dict):
            continue
        balance_delta = account.get("balance")
        if not balance_delta:
            continue
        before, after = _diff_from_delta(balance_delta)
        if before is None and after is None:
            continue
        changes.append({
            "address": address,
            "asset": "ETH",
            "before": before,
            "after": after
        })
    return changes

def _diff_from_delta(delta):
    if not isinstance(delta, dict):
        return None, None
    if "from" in delta or "to" in delta:
        return delta.get("from"), delta.get("to")
    if "*" in delta:
        return None, delta.get("*")
    return None, None

def _eth_balance_changes(call_tree):
    """
    
    """
    if not call_tree: return []
    deltas = {}
    def walk(call):
        if not call:
            return
        value = _to_int(call.get("value"))
        from_addr = call.get("from")
        to_addr = call.get("to")
        if value and from_addr:
            deltas[from_addr] = deltas.get(from_addr, 0) - value
        if value and to_addr:
            deltas[to_addr] = deltas.get(to_addr, 0) + value
        for child in call.get("calls", []) or []:
            walk(child)
    walk(call_tree)
    changes = []
    for address, delta in deltas.items():
        if delta == 0:
            continue
        changes.append({
            "address": address,
            "asset": "ETH",
            "deltaWei": str(delta)
        })
    return changes

def _token_transfers_from_receipt(receipt):
    if not receipt: return []
    try:
        from web3 import Web3
    except Exception:
        return []
    transfer_topic = Web3.keccak(text="Transfer(address,address,uint256)").hex()
    transfer_single_topic = Web3.keccak(
        text="TransferSingle(address,address,address,uint256,uint256)"
    ).hex()
    transfer_batch_topic = Web3.keccak(
        text="TransferBatch(address,address,address,uint256[],uint256[])"
    ).hex()
    transfers = []
    for log in receipt.get("logs", []) or []:
        topic0 = _topic_hex(_get_log_topic(log, 0))
        if not topic0:
            continue
        if topic0 == transfer_topic:
            transfer = _decode_erc20_or_erc721(log)
            if transfer:
                transfers.append(transfer)
            continue
        if topic0 == transfer_single_topic:
            transfer = _decode_erc1155_single(log)
            if transfer:
                transfers.append(transfer)
            continue
        if topic0 == transfer_batch_topic:
            transfer = _decode_erc1155_batch(log)
            if transfer:
                transfers.append(transfer)
    return transfers

def _get_log_topic(log, index):
    topics = None
    if isinstance(log, dict):
        topics = log.get("topics")
    else:
        topics = getattr(log, "topics", None)
    if not topics or len(topics) <= index:
        return None
    return topics[index]

def _topic_hex(value):
    if value is None:
        return ""
    if hasattr(value, "hex"):
        hex_value = value.hex()
        if not hex_value.startswith("0x"):
            return "0x" + hex_value
        return hex_value
    if isinstance(value, bytes):
        return "0x" + value.hex()
    if isinstance(value, str):
        return value
    return ""

def _topic_to_address(topic):
    try:
        from web3 import Web3
    except Exception:
        return None

    hex_value = _topic_hex(topic)
    if not hex_value:
        return None
    if hex_value.startswith("0x"):
        hex_value = hex_value[2:]
    if len(hex_value) < 40:
        return None
    addr = "0x" + hex_value[-40:]

    try:
        return Web3.to_checksum_address(addr)
    except Exception:
        return addr

def _decode_erc20_or_erc721(log):
    topics = log.get("topics") if isinstance(log, dict) else getattr(log, "topics", [])
    if not topics or len(topics) < 3:
        return None

    from_addr = _topic_to_address(topics[1])
    to_addr = _topic_to_address(topics[2])
    token_address = log.get("address") if isinstance(log, dict) else getattr(log, "address", None)
    data = log.get("data") if isinstance(log, dict) else getattr(log, "data", None)

    token_type = "ERC20"
    amount = _to_int(data)
    token_id = None

    if len(topics) >= 4:
        token_type = "ERC721"
        token_id = _to_int(topics[3])
        amount = 1

    transfer = {
        "token": token_type,
        "tokenAddress": token_address,
        "from": from_addr,
        "to": to_addr,
        "amount": str(amount)
    }

    if token_id is not None:
        transfer["tokenId"] = str(token_id)

    return transfer

def _decode_erc1155_single(log):
    topics = log.get("topics") if isinstance(log, dict) else getattr(log, "topics", [])
    if not topics or len(topics) < 4:
        return None

    from_addr = _topic_to_address(topics[2])
    to_addr = _topic_to_address(topics[3])
    token_address = log.get("address") if isinstance(log, dict) else getattr(log, "address", None)
    data = log.get("data") if isinstance(log, dict) else getattr(log, "data", "")
    data_hex = data[2:] if isinstance(data, str) and data.startswith("0x") else str(data)

    if len(data_hex) < 128:
        return None

    token_id = int(data_hex[0:64], 16)
    value = int(data_hex[64:128], 16)

    return {
        "token": "ERC1155",
        "tokenAddress": token_address,
        "from": from_addr,
        "to": to_addr,
        "amount": str(value),
        "tokenId": str(token_id)
    }

def _decode_erc1155_batch(log):
    topics = log.get("topics") if isinstance(log, dict) else getattr(log, "topics", [])
    if not topics or len(topics) < 4:
        return None

    from_addr = _topic_to_address(topics[2])
    to_addr = _topic_to_address(topics[3])
    token_address = log.get("address") if isinstance(log, dict) else getattr(log, "address", None)

    return {
        "token": "ERC1155",
        "tokenAddress": token_address,
        "from": from_addr,
        "to": to_addr,
        "batch": True
    }


#--- general helpers -----------------------------------------------------------


def _to_int(value):
    """ 
    Normalize value to integer 
    """
    if value is None: return 0
    if isinstance(value, int): return value
    if hasattr(value, "hex"): return int(value.hex(), 16)
    if isinstance(value, str):
        if value.startswith("0x"): return int(value, 16)
        if value.isdigit(): return int(value)
    return 0