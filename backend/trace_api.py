from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI(title="EVM Trace API (Mock 模式)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/trace/{tx_hash}")
def get_transaction_trace(tx_hash: str):
    # 清理哈希前后的多余字符
    clean_tx_hash = tx_hash.strip()
    
    # 动态定位到项目根目录下的 mock_data 文件夹
    current_dir = os.path.dirname(os.path.abspath(__file__))
    mock_file_path = os.path.join(current_dir, "..", "mock_data", "trace_response.json")
    
    try:
        # 读取我提前写好的假数据
        with open(mock_file_path, "r", encoding="utf-8") as f:
            mock_data = json.load(f)
            
        # 把假数据里的txHash替换成前端传进来的这个
        mock_data["txHash"] = clean_tx_hash
        
        return mock_data
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="找不到 mock_data/trace_response.json！")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取本地数据失败: {str(e)}")