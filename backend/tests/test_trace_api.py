import pytest
from fastapi.testclient import TestClient
# 引入trace_api.py
from backend.trace_api import app 

# 创建“模拟浏览器”，在不启动真实服务器的情况下，直接发请求
client = TestClient(app)

def test_get_trace_success():
    """测试用例 1：传入正常的 Hash，检查是否成功返回 200 并包含 txHash"""
    test_hash = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"
    
    # 用模拟客户端发送 GET 请求
    response = client.get(f"/api/trace/{test_hash}")
    
    # 断言1：状态码必须是 200 (成功)
    assert response.status_code == 200
    
    # 断言2：返回的 JSON 数据里，txHash必须和传进去的一模一样
    data = response.json()
    assert data["txHash"] == test_hash
    # 断言3：确保输出数据结构 (Mock 数据里包含了status字段)
    assert "status" in data

def test_get_trace_with_spaces_and_dirty_chars():
    """测试用例 2：传入前后带空格的“脏”Hash，测试strip()防御机制"""
    dirty_hash = "   0x1234567890abcdef   "
    
    response = client.get(f"/api/trace/{dirty_hash}")
    
    assert response.status_code == 200
    data = response.json()
    # 断言：返回的JSON里，哈希已清洗
    assert data["txHash"] == "0x1234567890abcdef"

def test_invalid_endpoint():
    """测试用例 3：随便访问一个不存在的路由，必须返回 404"""
    response = client.get("/api/this_is_a_wrong_path")
    assert response.status_code == 404