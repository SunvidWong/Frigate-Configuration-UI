"""测试摄像头 API 端点"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from src.main import app

client = TestClient(app)


class TestCameraBrandsAPI:
    """摄像头品牌 API 测试"""

    def test_get_all_brands(self):
        """测试获取所有品牌列表"""
        response = client.get("/api/camera/brands")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["brands"]) >= 4
        assert any(b["id"] == "hikvision" for b in data["brands"])

    def test_get_brand_detail_hikvision(self):
        """测试获取海康威视品牌详情"""
        response = client.get("/api/camera/brand/hikvision")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["brand"]["name_zh"] == "海康威视"
        assert len(data["brand"]["stream_templates"]) >= 2

    def test_get_brand_detail_unknown(self):
        """测试获取未知品牌（应返回通用模板）"""
        response = client.get("/api/camera/brand/unknown")

        assert response.status_code == 200
        data = response.json()
        assert data["brand"]["id"] == "generic"


class TestRTSPURLBuilding:
    """RTSP URL 构建 API 测试"""

    def test_build_rtsp_url(self):
        """测试构建 RTSP URL"""
        response = client.post(
            "/api/camera/build-rtsp-url",
            params={
                "ip": "192.168.1.100",
                "username": "admin",
                "password": "pass123",
                "brand_id": "hikvision",
                "stream_index": 0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "rtsp://" in data["rtsp_url"]
        assert "192.168.1.100" in data["rtsp_url"]


class TestONVIFDiscovery:
    """ONVIF 发现 API 测试"""

    @patch('src.services.onvif_service.discover_onvif_devices')
    def test_discover_onvif(self, mock_discover):
        """测试 ONVIF 设备发现"""
        mock_discover.return_value = [
            {'ip': '192.168.1.100', 'port': 80}
        ]

        response = client.post(
            "/api/camera/discover-onvif",
            json={"timeout": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 1

    @patch('src.services.onvif_service.discover_onvif_devices')
    def test_discover_onvif_no_devices(self, mock_discover):
        """测试 ONVIF 发现无设备"""
        mock_discover.return_value = []

        response = client.post(
            "/api/camera/discover-onvif",
            json={"timeout": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0


class TestRTSPConnection:
    """RTSP 连接测试 API"""

    def test_test_rtsp_connection(self):
        """测试 RTSP 连接测试端点"""
        response = client.post(
            "/api/camera/test-rtsp",
            json={
                "ip": "192.168.1.100",
                "username": "admin",
                "password": "pass123",
                "brand": "hikvision",
                "port": 554
            }
        )

        # 目前是简化实现，应该返回成功
        assert response.status_code == 200
        data = response.json()
        assert "rtsp_url" in data
