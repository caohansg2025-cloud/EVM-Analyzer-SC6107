from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import json
from dotenv import load_dotenv

# 加载 .env 环境变量
load_dotenv()

app = FastAPI(title="EVM Trace API (双引擎版)")

# 配置跨域请求 (CORS)，允许前端调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 读取环境变量配置
RPC_URL = os.getenv("RPC_URL")
# 读取开关状态，如果 .env 里没写，默认强制开启 Mock 以保护系统不崩溃
USE_MOCK = os.getenv("USE_MOCK", "True").lower() in ("true", "1", "yes")


@app.get("/api/trace/{tx_hash}")
def get_transaction_trace(tx_hash: str):
    # 1. 自动清理前端传来的带空格的脏哈希
    clean_tx_hash = tx_hash.strip()

    # 1.本地 Mock 模式 (快速、免费、防宕机)
    if USE_MOCK:
        print(f"[引擎A: Mock 模式] 正在处理哈希: {clean_tx_hash}")
        current_dir = os.path.dirname(os.path.abspath(__file__))
        mock_file_path = os.path.join(current_dir, "..", "mock_data", "trace_response.json")
        
        try:
            with open(mock_file_path, "r", encoding="utf-8") as f:
                mock_data = json.load(f)
                
            # 把假数据里的 txHash 替换成请求的哈希
            mock_data["txHash"] = clean_tx_hash
            return mock_data
            
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="找不到 mock_data/trace_response.json，请检查文件路径！")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"读取 Mock 数据失败: {str(e)}")

   
    # 2.真实 RPC 节点模式 (需升级会员)
  
    else:
        print(f"[引擎B: 真实节点模式] 正在向 Alchemy 发射请求: {clean_tx_hash}")
        if not RPC_URL:
            raise HTTPException(status_code=500, detail="RPC_URL 未配置，请检查 .env 文件")

        payload = {
            "jsonrpc": "2.0",
            "method": "debug_traceTransaction",
            "params": [clean_tx_hash, {"tracer": "callTracer"}],
            "id": 1
        }
        
        try:
            response = requests.post(RPC_URL, json=payload)
            data = response.json()
            
            # 拦截并报错
            if "error" in data:
                raise HTTPException(status_code=400, detail=f"节点拒绝请求: {data['error']['message']}")
                
            return {
                "txHash": clean_tx_hash,
                "status": "success",
                "calls": data.get("result", {})
            }
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=502, detail=f"节点网络请求彻底失败: {str(e)}")