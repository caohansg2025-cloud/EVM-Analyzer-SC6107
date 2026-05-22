import os
import json
import requests

# 确保后端服务已经启动，并且 .env 里 USE_MOCK = False(本质是为了在可以使用时抓取真实数据，方便前端)
BASE_URL = "http://127.0.0.1:8000/api"
TARGET_HASH = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22026"

def save_json(filename, data):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    mock_path = os.path.join(current_dir, "..", "mock_data", filename)
    with open(mock_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"成功更新: {filename}")

def generate_tx_mocks():
    print(f"开始为哈希 {TARGET_HASH} 生成动态交易 Mock 数据...")
    
    # 1. 生成 Trace 假数据 (基于 txHash)
    trace_res = requests.get(f"{BASE_URL}/trace/{TARGET_HASH}")
    if trace_res.status_code == 200:
        save_json("trace_response.json", trace_res.json())
        
    # 2. 生成 Gas & State 假数据 (基于 txHash)
    gas_res = requests.post(f"{BASE_URL}/stat_diff", json={"txHash": TARGET_HASH})
    if gas_res.status_code == 200:
        save_json("gas_state_response.json", gas_res.json())
        
    # 注意：Security 模块是基于合约静态扫描的，故不变

    print("Trace 和 Gas 数据已同步至最新！Security 保持不变。")

if __name__ == "__main__":
    generate_tx_mocks()