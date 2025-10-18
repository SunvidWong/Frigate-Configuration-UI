"""测试 Docker daemon 连通性检查"""
import pytest
from unittest.mock import patch, MagicMock
import docker.errors
from src.services.preflight import check_docker_daemon
from src.models.error_codes import ErrorCode


def test_docker_daemon_unreachable():
    """测试 Docker daemon 不可达的情况"""
    with patch('docker.from_env') as mock_docker:
        mock_docker.side_effect = docker.errors.DockerException("Cannot connect")

        result = check_docker_daemon()

        assert result is False, "Daemon 不可达时应返回 False"


def test_docker_daemon_ping_fails():
    """测试 Docker daemon ping 失败"""
    mock_client = MagicMock()
    mock_client.ping.side_effect = docker.errors.APIError("Ping failed")

    with patch('docker.from_env', return_value=mock_client):
        result = check_docker_daemon()

        assert result is False, "Ping 失败时应返回 False"


def test_docker_daemon_ok():
    """测试 Docker daemon 正常连接"""
    mock_client = MagicMock()
    mock_client.ping.return_value = True

    with patch('docker.from_env', return_value=mock_client):
        result = check_docker_daemon()

        assert result is True, "Daemon 正常时应返回 True"


def test_docker_daemon_error_message():
    """测试错误消息包含正确的错误码"""
    from src.models.error_codes import get_error_message

    msg = get_error_message(ErrorCode.DOCKER_DAEMON)

    assert msg.code == ErrorCode.DOCKER_DAEMON
    assert "daemon" in msg.description.lower() or "不可达" in msg.description
    assert "docker" in msg.suggestion.lower() or "服务" in msg.suggestion
