import json
import os
from web3 import Web3
import pprint

class TransactionAnalyzer:
    def __init__(self, registry_path: str, abi_dir: str):
        """
        读取路由表，并将所有专用字典和兜底字典加载到内存中。
        """
        self.w3 = Web3()
        # 存储高级协议解码器映射 {address: contract_obj}
        self.decoders = {}  

        # 存储兜底解码器
        self.fallback_decoder = None 
        
        # 1. 挂载智能路由表
        if os.path.exists(registry_path):
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
        else:
            registry = {}
            print(f"[-] 警告：找不到路由表 {registry_path}")

        # 2. 预热高级协议字典
        for address, abi_filename in registry.items():
            abi_path = os.path.join(abi_dir, abi_filename)
            if os.path.exists(abi_path):
                with open(abi_path, 'r', encoding='utf-8') as f:
                    self.decoders[address.lower()] = self.w3.eth.contract(abi=json.load(f))
            else:
                print(f"[-] 提示：路由表引用了 {abi_filename}，但目录下未找到该文件，已跳过。")

        # 3. 挂载 ERC-20 兜底字典
        fallback_path = os.path.join(abi_dir, "erc20_standard.json")
        if os.path.exists(fallback_path):
            with open(fallback_path, 'r', encoding='utf-8') as f:
                self.fallback_decoder = self.w3.eth.contract(abi=json.load(f))
            print(f"[+] 系统准备就绪，已成功加载 {len(self.decoders)} 个协议特异性字典与 1 个兜底字典！")
        else:
            print("[-] 严重警告：找不到兜底的 erc20_standard.json！")

    def decode_input_data(self, to_address: str, input_hex: str) -> dict:
        """
        核心分流逻辑：先尝试精确匹配，失败则触发降级兜底。
        """
        if not input_hex or input_hex == "0x":
            return {"match_level": "Native", "action_type": "Native Transfer", "details": "原生 ETH 交互"}

        target = to_address.lower() if to_address else ""

        # 1：协议精确匹配
        if target in self.decoders:
            try:
                func_obj, func_params = self.decoders[target].decode_function_input(input_hex)
                return {
                    "match_level": "High (Protocol Specific)",
                    "action_type": "Contract Call",
                    "function_name": func_obj.fn_name,
                    "parameters": func_params
                }
            except ValueError:
                # 如果高级字典解不开这个函数，放行给ERC-20
                pass 

        # 2：ERC-20兜底
        if self.fallback_decoder:
            try:
                func_obj, func_params = self.fallback_decoder.decode_function_input(input_hex)
                return {
                    "match_level": "Medium (Standard ERC-20)",
                    "action_type": "Token Call",
                    "function_name": func_obj.fn_name,
                    "parameters": func_params
                }
            except ValueError:
                return {"match_level": "Low", "action_type": "Unknown", "details": "所有字典均无法解码", "raw_data": input_hex}
        
        return {"action_type": "Error", "details": "系统异常，无可用解码器"}

    def _process_execution_flow(self, trace_data: dict) -> dict:
        """处理执行流，组装报告"""
        tx_hash = trace_data.get("tx_hash", "Unknown")
        calls = trace_data.get("calls", [])
        
        parsed_results = {
            "transaction_hash": tx_hash,
            "total_internal_calls": len(calls),
            "execution_flow": []
        }

        for step_index, call in enumerate(calls):
            to_addr = call.get("to")
            raw_input = call.get("input")
            
            # 将目标地址一起传给解码器，用于智能路由
            decoded_info = self.decode_input_data(to_addr, raw_input)

            parsed_results["execution_flow"].append({
                "step": step_index + 1,
                "type": call.get("type"),
                "from": call.get("from"),
                "to": to_addr,
                "decoded_action": decoded_info
            })

        return parsed_results

    def run_mock_analysis(self, mock_json_path: str) -> dict:
        with open(mock_json_path, 'r', encoding='utf-8') as f:
            return self._process_execution_flow(json.load(f))

    def run_real_analysis(self, alchemy_api_response: dict) -> dict:
        return self._process_execution_flow(alchemy_api_response)

# 验证：本地独立运行测试
if __name__ == "__main__":
    # 配置路径
    REGISTRY_PATH = "backend/config/contract_registry.json"
    ABI_DIR = "backend/abi_library"
    MOCK_DATA_PATH = "mock_data/sample_trace.json"

    # 1. 实例化并自动挂载多重字典
    analyzer = TransactionAnalyzer(REGISTRY_PATH, ABI_DIR)
    
    # 2. 从Mock入口启动
    final_report = analyzer.run_mock_analysis(MOCK_DATA_PATH)

    # 3. 打印效果
    if final_report:
        print("\n============ 智能路由解析报告 ============\n")
        pprint.pprint(final_report, indent=4)