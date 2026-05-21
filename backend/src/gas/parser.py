from dataclasses import dataclass, field
from typing import Any, List, Optional

from api.abi import get_function_signature


@dataclass
class GasFunctionStat:
    contract: Optional[str]
    function: str
    call_type: Optional[str]
    calls: int
    gas_used: int

    def to_dict(self):
        return {
            "contract": self.contract,
            "function": self.function,
            "callType": self.call_type,
            "calls": self.calls,
            "gasUsed": self.gas_used
        }


@dataclass
class GasTreeNode:
    call_type: Optional[str]
    from_addr: Optional[str]
    to_addr: Optional[str]
    input_data: Optional[str]
    value: Any
    gas_used: Any
    function: str
    gas_used_exclusive: int
    gas_used_inclusive: int
    calls: List["GasTreeNode"] = field(default_factory=list)

    def to_dict(self):
        return {
            "type": self.call_type,
            "from": self.from_addr,
            "to": self.to_addr,
            "input": self.input_data,
            "value": self.value,
            "gasUsed": self.gas_used,
            "function": self.function,
            "gasUsedExclusive": self.gas_used_exclusive,
            "gasUsedInclusive": self.gas_used_inclusive,
            "calls": [child.to_dict() for child in self.calls]
        }


#--- gas decomposition by func (aggr) ------------------------------------------


# deprecated
#
# def gas_by_function(call_tree, exclusive=False):
    
#     if not call_tree: return []
#     entries = {}
#     _walk_call_tree(call_tree, entries, exclusive)
#     result = list(entries.values())
#     result.sort(key=lambda item: item["gas_used"], reverse=True)
#     return result


def gas_by_function(call_tree, exclusive=False):
    """ 
    Return gas used by function given the call tree (callTracer), 
    
    notice that the function label will be the hash[:10], need to call selector 
    mapper to retrieve funciton name from abi.
    """
    if not call_tree:
        return []
    entries = {}
    _walk_call_tree(call_tree, entries, exclusive)
    result = [
        GasFunctionStat(
            contract=item["contract"],
            function=item["function"],
            call_type=item["call_type"],
            calls=item["calls"],
            gas_used=item["gas_used"]
        )
        for item in entries.values()
    ]
    result.sort(key=lambda item: item.gas_used, reverse=True)
    return result

def gas_by_function_json(call_tree, exclusive=False):
    return [item.to_dict() for item in gas_by_function(call_tree, exclusive)]

def _walk_call_tree(call, entries, exclusive: bool):
    """
    Traverse and parse the call tree:

    call is a dict from callTracer, shaped like:
    {
        "type": "CALL" | "DELEGATECALL" | "STATICCALL" | "CREATE" | ...,
        "from": "0x...",
        "to": "0x...",
        "input": "0x...",
        "value": "0x..." or int,
        "gasUsed": "0x..." or int,
        "calls": [child_call, ...]
    }

    here, we will recursively decompose the the call tree, and fit them into the 
    entries as a list
    """
    if not call: return
    to_addr = call.get("to")
    call_type = call.get("type")
    gas_used = _to_int(call.get("gasUsed"))
    if exclusive:
        for child in call.get("calls", []) or []:
            gas_used -= _to_int(child.get("gasUsed"))
    function_label = _function_label(call)
    key = (to_addr, function_label, call_type)
    if key not in entries:
        entries[key] = {
            "contract": to_addr,
            "function": function_label,
            "call_type": call_type,
            "calls": 0,
            "gas_used": 0
        }
    entries[key]["calls"] += 1
    entries[key]["gas_used"] += gas_used
    for child in call.get("calls", []) or []:
        _walk_call_tree(child, entries, exclusive)

def _function_label(call):
    input_data = call.get("input")
    to_addr = call.get("to")
    if not isinstance(input_data, str):
        return "unknown"
    data = input_data.lower()
    if data in ("0x", ""): # if no call data
        if _to_int(call.get("value")) > 0:
            return "receive"
        return "fallback"
    if data.startswith("0x") and len(data) >= 10:
        selector = data[:10]
        signature = get_function_signature(to_addr, selector)
        return signature or selector
    return "unknown"


#--- gas decomposition by func (tree) ------------------------------------------


def gas_tree(call_tree):
    """
    Return a call-trace-shaped tree annotated with gas usage.
    """
    if not call_tree:
        return None
    return _build_gas_tree(call_tree)


def gas_tree_model(call_tree):
    if not call_tree:
        return None
    return _build_gas_tree_node(call_tree)


def gas_tree_json(call_tree):
    node = gas_tree_model(call_tree)
    if not node:
        return None
    return node.to_dict()


def _build_gas_tree(call):
    if not call:
        return None

    gas_used_exclusive = _to_int(call.get("gasUsed"))
    gas_used_inclusive = gas_used_exclusive
    children = []

    for child in call.get("calls", []) or []:
        child_node = _build_gas_tree(child)
        if child_node:
            children.append(child_node)
            gas_used_inclusive += _to_int(child_node.get("gasUsedInclusive"))

    return {
        "type": call.get("type"),
        "from": call.get("from"),
        "to": call.get("to"),
        "input": call.get("input"),
        "value": call.get("value"),
        "gasUsed": call.get("gasUsed"),
        "function": _function_label(call),
        "gasUsedExclusive": gas_used_exclusive,
        "gasUsedInclusive": gas_used_inclusive,
        "calls": children
    }


def _build_gas_tree_node(call):
    if not call:
        return None

    gas_used_exclusive = _to_int(call.get("gasUsed"))
    gas_used_inclusive = gas_used_exclusive
    children = []

    for child in call.get("calls", []) or []:
        child_node = _build_gas_tree_node(child)
        if child_node:
            children.append(child_node)
            gas_used_inclusive += child_node.gas_used_inclusive

    return GasTreeNode(
        call_type=call.get("type"),
        from_addr=call.get("from"),
        to_addr=call.get("to"),
        input_data=call.get("input"),
        value=call.get("value"),
        gas_used=call.get("gasUsed"),
        function=_function_label(call),
        gas_used_exclusive=gas_used_exclusive,
        gas_used_inclusive=gas_used_inclusive,
        calls=children
    )


#--- gas decomposition by opcode -----------------------------------------------


def gas_by_opcode(struct_logs):
    """ 
    Return gas consumed by evm operation
    """
    gas_map = {}
    for log in struct_logs:
        op = log.get("op")
        gas_cost = log.get("gasCost", 0)
        gas_map[op] = gas_map.get(op, 0) + gas_cost
    return gas_map



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