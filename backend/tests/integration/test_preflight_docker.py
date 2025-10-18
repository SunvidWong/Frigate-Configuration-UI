"""集成测试 - Docker socket 预检

这些测试需要真实的 Docker 环境
"""
import pytest
from pathlib import Path
from src.services.preflight import check_docker_socket, check_docker_daemon


@pytest.mark.integration
def test_docker_socket_ok():
    """测试真实环境中的 Docker socket 检查

    此测试需要:
    - Docker daemon 正在运行
    - /var/run/docker.sock 已挂载
    - 当前用户有读写权限
    """
    socket_path = Path("/var/run/docker.sock")

    # 如果当前环境没有 Docker socket，跳过测试
    if not socket_path.exists():
        pytest.skip("Docker socket 不存在，跳过集成测试")

    result = check_docker_socket()

    assert result is True, "在有效的 Docker 环境中应返回 True"


@pytest.mark.integration
def test_docker_socket_integration_with_daemon():
    """测试 Docker socket 与 daemon 的集成性

    验证 socket 不仅存在，还能实际连接到 Docker daemon
    """
    import docker
    from pathlib import Path

    socket_path = Path("/var/run/docker.sock")

    if not socket_path.exists():
        pytest.skip("Docker socket 不存在，跳过集成测试")

    # 预检应该通过
    assert check_docker_socket() is True

    # 且应能成功创建 Docker 客户端
    try:
        client = docker.from_env()
        client.ping()  # 验证能与 daemon 通信
    except Exception as e:
        pytest.fail(f"Docker socket 存在但无法连接到 daemon: {e}")


@pytest.mark.integration
def test_docker_daemon_connectivity():
    """测试 Docker daemon 连通性检查 - T007 集成测试

    验证 check_docker_daemon() 在真实环境中的行为
    """
    from pathlib import Path

    socket_path = Path("/var/run/docker.sock")

    if not socket_path.exists():
        pytest.skip("Docker socket 不存在，跳过集成测试")

    result = check_docker_daemon()

    assert result is True, "在有效的 Docker 环境中 daemon 检查应通过"
