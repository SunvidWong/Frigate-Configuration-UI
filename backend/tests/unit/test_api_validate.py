"""测试验证 API 端点"""
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


class TestInstanceNameValidationAPI:
    """实例名称验证 API 测试"""

    def test_valid_instance_name(self):
        """测试有效的实例名称"""
        response = client.get("/api/validate/instance-name?name=camera-front")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["error"] is None

    def test_invalid_instance_name_too_short(self):
        """测试无效的实例名称（过短）"""
        response = client.get("/api/validate/instance-name?name=ab")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["error"] is not None
        assert "3" in data["error"]

    def test_invalid_instance_name_uppercase(self):
        """测试无效的实例名称（包含大写）"""
        response = client.get("/api/validate/instance-name?name=Camera")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["error"] is not None

    def test_missing_name_parameter(self):
        """测试缺少 name 参数"""
        response = client.get("/api/validate/instance-name")

        assert response.status_code == 422  # Unprocessable Entity


class TestCameraNameValidationAPI:
    """摄像头名称验证 API 测试"""

    def test_valid_camera_name(self):
        """测试有效的摄像头名称"""
        response = client.get("/api/validate/camera-name?name=cam-front")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_invalid_camera_name(self):
        """测试无效的摄像头名称"""
        response = client.get("/api/validate/camera-name?name=Cam-Front")

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["error"] is not None
