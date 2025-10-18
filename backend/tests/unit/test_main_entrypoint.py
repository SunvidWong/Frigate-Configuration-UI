"""测试应用入口点预检逻辑"""
import pytest
from unittest.mock import patch, MagicMock
from src.main import run_preflight_checks


def test_preflight_all_pass():
    """测试所有预检都通过的情况"""
    with patch('src.services.preflight.check_docker_socket', return_value=True), \
         patch('src.services.preflight.check_docker_daemon', return_value=True):

        result = run_preflight_checks()

        assert result is True, "所有检查通过时应返回 True"


def test_preflight_socket_fails():
    """测试 Docker socket 检查失败"""
    with patch('src.services.preflight.check_docker_socket', return_value=False), \
         patch('src.services.preflight.check_docker_daemon', return_value=True):

        result = run_preflight_checks()

        assert result is False, "Socket 检查失败时应返回 False"


def test_preflight_daemon_fails():
    """测试 Docker daemon 检查失败"""
    with patch('src.services.preflight.check_docker_socket', return_value=True), \
         patch('src.services.preflight.check_docker_daemon', return_value=False):

        result = run_preflight_checks()

        assert result is False, "Daemon 检查失败时应返回 False"


def test_preflight_short_circuit():
    """测试预检短路行为 - socket 失败后不应检查 daemon"""
    mock_daemon = MagicMock()

    with patch('src.services.preflight.check_docker_socket', return_value=False), \
         patch('src.services.preflight.check_docker_daemon', mock_daemon):

        result = run_preflight_checks()

        assert result is False
        # Daemon 检查不应被调用（短路）
        mock_daemon.assert_not_called()


def test_preflight_image_check_with_warning():
    """测试镜像检查返回警告但不阻止启动"""
    with patch('src.services.preflight.check_docker_socket', return_value=True), \
         patch('src.services.preflight.check_docker_daemon', return_value=True), \
         patch('src.services.preflight.check_image_local') as mock_image:

        mock_image.return_value = {
            "exists": True,
            "age_days": 45,
            "warning": "IMAGE_CACHE_OLD",
            "error": None
        }

        result = run_preflight_checks()

        # 镜像警告不应阻止启动
        assert result is True
