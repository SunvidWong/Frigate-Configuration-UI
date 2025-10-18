"""测试预检逻辑 - Docker socket 检查"""
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
from src.services.preflight import check_docker_socket
from src.models.error_codes import ErrorCode


def test_docker_socket_missing():
    """测试 /var/run/docker.sock 不存在的情况 - FR-001"""
    with patch('pathlib.Path.exists', return_value=False):
        result = check_docker_socket()

        assert result is False, "Docker socket 不存在时应返回 False"


def test_docker_socket_not_readable():
    """测试 /var/run/docker.sock 存在但不可读"""
    with patch('pathlib.Path.exists', return_value=True), \
         patch('os.access', return_value=False):
        result = check_docker_socket()

        assert result is False, "Docker socket 不可读时应返回 False"


def test_docker_socket_ok():
    """测试 /var/run/docker.sock 正常可用"""
    with patch('pathlib.Path.exists', return_value=True), \
         patch('os.access', return_value=True):
        result = check_docker_socket()

        assert result is True, "Docker socket 正常时应返回 True"


def test_docker_socket_error_message_format():
    """测试错误消息格式包含错误码和中文描述"""
    from src.models.error_codes import get_error_message

    msg = get_error_message(ErrorCode.DOCKER_SOCKET)

    assert msg.code == ErrorCode.DOCKER_SOCKET
    assert "docker.sock" in msg.description.lower() or "挂载" in msg.description
    assert len(msg.suggestion) > 0, "应包含修复建议"
