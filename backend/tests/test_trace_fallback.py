import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
import os

client = TestClient(app)

def test_trace_api_degradation_on_invalid_hash():
    """测试当传入无效哈希或节点拒绝服务时，接口是否能优雅降级而不是直接500崩溃"""
    # 传入一个完全不符合十六进制规范的脏数据
    invalid_hash = "0xthisisabsolutelyinvalidhashforalchemy"
    
    response = client.get(f"/api/trace/{invalid_hash}")
    
    # 只要防火墙生效，就不该返回500(Internal Server Error)
    # 预期要么是 400 (Bad Request), 403 (Forbidden/Free Tier), 或者 404
    assert response.status_code != 500
    assert response.status_code in [400, 403, 404]
    
    data = response.json()
    assert "detail" in data