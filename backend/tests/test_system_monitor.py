import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    """测试系统大盘监控接口是否存活，且返回格式是否符合 DevOps 规范"""
    response = client.get("/api/system/health")
    assert response.status_code == 200
    
    data = response.json()
    # 断言1:必须包含这三个关键指标
    assert data["status"] == "Running"
    assert "engineMode" in data
    assert "cacheMetrics" in data
    
    # 断言2:缓存指标的格式准确
    metrics = data["cacheMetrics"]
    assert isinstance(metrics["capacity"], int)
    assert isinstance(metrics["currentUsage"], int)
    assert "%" in metrics["utilizationRate"]