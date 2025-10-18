"""测试镜像本地检查逻辑"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import docker.errors
from src.services.preflight import check_image_local
from src.models.error_codes import ErrorCode


def test_image_not_found_locally():
    """测试本地无镜像缓存的情况"""
    mock_client = MagicMock()
    mock_client.images.get.side_effect = docker.errors.ImageNotFound("Not found")

    with patch('docker.from_env', return_value=mock_client):
        result = check_image_local("ghcr.io/blakeblackshear/frigate:stable")

        assert result["exists"] is False
        assert result["warning"] is None


def test_image_exists_recent():
    """测试本地镜像存在且较新（< 30天）"""
    mock_client = MagicMock()
    mock_image = MagicMock()

    # 模拟 10 天前创建的镜像
    recent_time = datetime.now() - timedelta(days=10)
    mock_image.attrs = {
        "Created": recent_time.isoformat()
    }
    mock_client.images.get.return_value = mock_image

    with patch('docker.from_env', return_value=mock_client):
        result = check_image_local("ghcr.io/blakeblackshear/frigate:stable")

        assert result["exists"] is True
        assert result["warning"] is None
        assert result["age_days"] == 10


def test_image_exists_old():
    """测试本地镜像存在但已过期（> 30天）"""
    mock_client = MagicMock()
    mock_image = MagicMock()

    # 模拟 45 天前创建的镜像
    old_time = datetime.now() - timedelta(days=45)
    mock_image.attrs = {
        "Created": old_time.isoformat()
    }
    mock_client.images.get.return_value = mock_image

    with patch('docker.from_env', return_value=mock_client):
        result = check_image_local("ghcr.io/blakeblackshear/frigate:stable")

        assert result["exists"] is True
        assert result["warning"] == ErrorCode.IMAGE_CACHE_OLD
        assert result["age_days"] == 45


def test_image_check_docker_error():
    """测试 Docker 连接失败"""
    mock_client = MagicMock()
    mock_client.images.get.side_effect = docker.errors.APIError("Connection failed")

    with patch('docker.from_env', return_value=mock_client):
        result = check_image_local("ghcr.io/blakeblackshear/frigate:stable")

        assert result["exists"] is False
        assert result["error"] is not None


def test_image_cache_old_warning_message():
    """测试镜像缓存过期警告消息格式"""
    from src.models.error_codes import get_error_message

    msg = get_error_message(ErrorCode.IMAGE_CACHE_OLD)

    assert msg.code == ErrorCode.IMAGE_CACHE_OLD
    assert "30" in msg.description or "过期" in msg.description
    assert "pull" in msg.suggestion.lower() or "拉取" in msg.suggestion
