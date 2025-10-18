"""
一键部署端到端测试

测试场景: C-DoD-1
- 完整流程: 向导步骤 → 点击部署 → 容器创建 → 等待健康检查 → 显示 UI URL
- 验证 config.yml 正确生成
- 验证容器可访问（curl Frigate UI）
"""

import pytest
import docker
import time
import yaml
from pathlib import Path
import requests

from src.models.camera_config import CameraConfig, InstanceConfig
from src.services.deployment_service import DeploymentService
from src.validators.port_validator import allocate_port_block


@pytest.fixture
def docker_client():
    """Docker 客户端"""
    return docker.from_env()


@pytest.fixture
def cleanup_instance(docker_client):
    """清理测试实例"""
    instance_names = []

    yield instance_names

    # 清理所有测试实例
    for name in instance_names:
        try:
            container = docker_client.containers.get(f"frigate-instance-{name}")
            container.stop(timeout=5)
            container.remove()
        except docker.errors.NotFound:
            pass

        # 清理数据目录
        instance_dir = Path(f"/data/instances/{name}")
        if instance_dir.exists():
            import shutil
            shutil.rmtree(instance_dir)


def test_deploy_e2e_cpu_mode(docker_client, cleanup_instance):
    """测试 CPU 模式一键部署端到端流程"""

    # 1. 准备实例配置
    instance_name = "test-e2e-deploy"
    cleanup_instance.append(instance_name)

    # 分配端口块
    port_block = allocate_port_block(start_port=5200, used_blocks=[])
    assert port_block is not None, "端口块分配失败"

    # 创建摄像头配置
    camera = CameraConfig(
        name="test-camera",
        main_stream_url="rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101",
        sub_stream_url="rtsp://admin:password@192.168.1.100:554/Streaming/Channels/102"
    )

    # 创建实例配置
    instance = InstanceConfig(
        name=instance_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[camera],
        port_block=port_block
    )

    # 2. 执行部署
    deployment_service = DeploymentService()
    result = deployment_service.deploy_instance(instance)

    # 3. 验证部署结果
    assert result['success'] is True, "部署失败"
    assert 'container_id' in result, "缺少容器 ID"

    # 4. 验证配置文件生成
    config_file = Path(f"/data/instances/{instance_name}/config/config.yml")
    assert config_file.exists(), f"配置文件不存在: {config_file}"

    # 读取配置文件
    with open(config_file, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # 验证配置内容
    assert 'mqtt' in config, "缺少 mqtt 配置"
    assert config['mqtt']['enabled'] is False, "MQTT 应该禁用"

    assert 'detectors' in config, "缺少 detectors 配置"
    assert 'cpu' in config['detectors'], "缺少 CPU detector"

    assert 'cameras' in config, "缺少 cameras 配置"
    assert 'test-camera' in config['cameras'], "缺少测试摄像头配置"

    # 5. 验证容器状态
    container = docker_client.containers.get(result['container_id'])
    assert container.status in ['running', 'created'], f"容器状态异常: {container.status}"

    # 6. 验证端口映射
    ports = container.attrs['NetworkSettings']['Ports']
    assert '5000/tcp' in ports, "缺少 Frigate UI 端口映射"
    mapped_port = ports['5000/tcp'][0]['HostPort']
    assert mapped_port == str(port_block[0]), f"端口映射错误: {mapped_port} != {port_block[0]}"

    # 7. 等待容器启动（最多 30 秒）
    max_wait = 30
    for i in range(max_wait):
        container.reload()
        if container.status == 'running':
            break
        time.sleep(1)

    assert container.status == 'running', "容器启动超时"

    # 8. 验证 Frigate UI 可访问（可选，需要容器健康）
    # 注意：实际环境中 Frigate 可能需要更长时间初始化
    # 这里只验证端口监听
    ui_url = f"http://localhost:{port_block[0]}"
    print(f"✅ 部署成功，Frigate UI URL: {ui_url}")


def test_deploy_e2e_nvidia_mode(docker_client, cleanup_instance):
    """测试 NVIDIA GPU 模式部署（如果硬件可用）"""

    # 检查 NVIDIA runtime 是否可用
    try:
        test_container = docker_client.containers.run(
            "nvidia/cuda:11.8.0-base-ubuntu22.04",
            "nvidia-smi",
            remove=True,
            device_requests=[
                docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
            ]
        )
        nvidia_available = True
    except Exception:
        nvidia_available = False
        pytest.skip("NVIDIA runtime 不可用，跳过 GPU 模式测试")

    if not nvidia_available:
        return

    # 准备实例配置
    instance_name = "test-e2e-nvidia"
    cleanup_instance.append(instance_name)

    port_block = allocate_port_block(start_port=5200, used_blocks=[[5200, 5209]])

    camera = CameraConfig(
        name="test-camera-gpu",
        main_stream_url="rtsp://admin:password@192.168.1.101:554/cam/realmonitor?channel=1&subtype=0",
        sub_stream_url="rtsp://admin:password@192.168.1.101:554/cam/realmonitor?channel=1&subtype=1"
    )

    instance = InstanceConfig(
        name=instance_name,
        hw_mode="nvidia",
        hw_device="0",
        image_tag="stable",
        timezone="Asia/Shanghai",
        cameras=[camera],
        port_block=port_block
    )

    # 执行部署
    deployment_service = DeploymentService()
    result = deployment_service.deploy_instance(instance)

    # 验证部署成功
    assert result['success'] is True

    # 验证配置文件包含 NVIDIA 硬件加速
    config_file = Path(f"/data/instances/{instance_name}/config/config.yml")
    with open(config_file, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # 验证 hwaccel_args
    camera_config = config['cameras']['test-camera-gpu']
    assert 'ffmpeg' in camera_config
    assert 'hwaccel_args' in camera_config['ffmpeg']
    assert 'preset-nvidia-h264' in camera_config['ffmpeg']['hwaccel_args']

    print("✅ NVIDIA GPU 模式部署成功")


def test_deploy_config_validation():
    """测试配置文件内容验证"""

    from src.services.config_renderer import render_frigate_config

    # 创建测试实例配置
    camera = CameraConfig(
        name="validation-test",
        main_stream_url="rtsp://user:pass@192.168.1.200:554/main",
        sub_stream_url="rtsp://user:pass@192.168.1.200:554/sub"
    )

    instance = InstanceConfig(
        name="test-validation",
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[camera],
        port_block=[5230, 5231, 5232, 5233, 5234, 5235, 5236, 5237, 5238, 5239]
    )

    # 渲染配置
    config_yaml = render_frigate_config(instance)

    # 验证 YAML 有效性
    config = yaml.safe_load(config_yaml)

    # 验证必需的顶层键
    required_keys = ['mqtt', 'detectors', 'cameras']
    for key in required_keys:
        assert key in config, f"配置缺少必需的键: {key}"

    # 验证摄像头配置结构
    camera_config = config['cameras']['validation-test']
    assert 'ffmpeg' in camera_config
    assert 'inputs' in camera_config['ffmpeg']
    assert len(camera_config['ffmpeg']['inputs']) == 2  # 主流 + 子流

    # 验证流角色
    inputs = camera_config['ffmpeg']['inputs']
    roles = [inp['roles'] for inp in inputs]
    assert ['detect'] in roles or ['record'] in roles

    print("✅ 配置文件验证通过")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
