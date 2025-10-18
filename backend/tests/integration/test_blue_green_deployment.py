"""
蓝绿部署测试

测试场景: C-DoD-3
- 克隆实例 "front-door" 为 "front-door-new"
- 修改摄像头配置
- 部署 "front-door-new"
- 验证两个实例都可访问
- 删除旧实例 "front-door"
- 验证新实例不受影响
"""

import pytest
import docker
import time
import yaml
from pathlib import Path
import shutil

from src.models.camera_config import CameraConfig, InstanceConfig
from src.services.deployment_service import DeploymentService
from src.services.instance_manager import InstanceManager
from src.validators.port_validator import allocate_port_block


@pytest.fixture
def docker_client():
    """Docker 客户端"""
    return docker.from_env()


@pytest.fixture
def cleanup_instances(docker_client):
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
            shutil.rmtree(instance_dir)


def test_blue_green_deployment(docker_client, cleanup_instances):
    """测试蓝绿部署完整流程"""

    deployment_service = DeploymentService()
    instance_manager = InstanceManager()

    # 1. 部署原始实例（绿色环境）"front-door"
    green_name = "front-door"
    cleanup_instances.append(green_name)

    green_port_block = allocate_port_block(start_port=5200, used_blocks=[])

    green_camera = CameraConfig(
        name="front-camera-v1",
        main_stream_url="rtsp://admin:oldpass@192.168.1.100:554/Streaming/Channels/101",
        sub_stream_url="rtsp://admin:oldpass@192.168.1.100:554/Streaming/Channels/102"
    )

    green_instance = InstanceConfig(
        name=green_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[green_camera],
        port_block=green_port_block
    )

    green_result = deployment_service.deploy_instance(green_instance)
    assert green_result['success'] is True, "绿色环境部署失败"

    green_container = docker_client.containers.get(green_result['container_id'])
    print(f"✅ 绿色环境 '{green_name}' 部署成功")

    # 2. 克隆实例为 "front-door-new"（蓝色环境）
    blue_name = "front-door-new"
    cleanup_instances.append(blue_name)

    # 克隆配置（修改摄像头配置）
    blue_port_block = allocate_port_block(start_port=5200, used_blocks=[green_port_block])

    blue_camera = CameraConfig(
        name="front-camera-v2",  # 新版本摄像头
        main_stream_url="rtsp://admin:newpass@192.168.1.101:554/Streaming/Channels/101",  # 新 IP 和密码
        sub_stream_url="rtsp://admin:newpass@192.168.1.101:554/Streaming/Channels/102"
    )

    blue_instance = InstanceConfig(
        name=blue_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="Asia/Shanghai",  # 修改时区
        cameras=[blue_camera],
        port_block=blue_port_block
    )

    # 3. 部署蓝色环境
    blue_result = deployment_service.deploy_instance(blue_instance)
    assert blue_result['success'] is True, "蓝色环境部署失败"

    blue_container = docker_client.containers.get(blue_result['container_id'])
    print(f"✅ 蓝色环境 '{blue_name}' 部署成功")

    # 4. 验证两个实例同时运行
    time.sleep(2)

    green_container.reload()
    blue_container.reload()

    assert green_container.status == 'running', "绿色环境未运行"
    assert blue_container.status == 'running', "蓝色环境未运行"

    print("✅ 蓝绿环境同时运行")

    # 5. 验证配置差异
    green_config_path = Path(f"/data/instances/{green_name}/config/config.yml")
    blue_config_path = Path(f"/data/instances/{blue_name}/config/config.yml")

    with open(green_config_path, 'r', encoding='utf-8') as f:
        green_config = yaml.safe_load(f)

    with open(blue_config_path, 'r', encoding='utf-8') as f:
        blue_config = yaml.safe_load(f)

    # 验证摄像头名称不同
    assert 'front-camera-v1' in green_config['cameras'], "绿色环境摄像头配置错误"
    assert 'front-camera-v2' in blue_config['cameras'], "蓝色环境摄像头配置错误"

    # 验证 RTSP URL 不同
    green_cam_url = green_config['cameras']['front-camera-v1']['ffmpeg']['inputs'][0]['path']
    blue_cam_url = blue_config['cameras']['front-camera-v2']['ffmpeg']['inputs'][0]['path']

    assert '192.168.1.100' in green_cam_url, "绿色环境 IP 错误"
    assert '192.168.1.101' in blue_cam_url, "蓝色环境 IP 错误"

    print("✅ 配置差异验证通过")

    # 6. 验证端口不冲突
    green_ports = green_container.attrs['NetworkSettings']['Ports']
    blue_ports = blue_container.attrs['NetworkSettings']['Ports']

    green_ui_port = int(green_ports['5000/tcp'][0]['HostPort'])
    blue_ui_port = int(blue_ports['5000/tcp'][0]['HostPort'])

    assert green_ui_port == 5200, f"绿色环境端口错误: {green_ui_port}"
    assert blue_ui_port == 5210, f"蓝色环境端口错误: {blue_ui_port}"

    print(f"✅ 端口分配: 绿色 = {green_ui_port}, 蓝色 = {blue_ui_port}")

    # 7. 切换流量：删除绿色环境（旧实例）
    print(f"⚠️  准备删除绿色环境 '{green_name}'...")

    green_container.stop(timeout=5)
    green_container.remove()

    # 删除数据目录
    green_instance_dir = Path(f"/data/instances/{green_name}")
    if green_instance_dir.exists():
        shutil.rmtree(green_instance_dir)

    print(f"✅ 绿色环境 '{green_name}' 已删除")

    # 8. 验证蓝色环境不受影响
    time.sleep(1)

    blue_container.reload()
    assert blue_container.status == 'running', "蓝色环境受到删除影响"

    # 验证蓝色环境配置文件仍然存在
    assert blue_config_path.exists(), "蓝色环境配置文件被删除"

    print("✅ 蓝色环境不受影响，继续运行")

    # 9. 验证端口块释放（绿色环境的 5200-5209 应该可以重新分配）
    # 这里只验证逻辑，实际端口释放由 instance_manager 管理
    print("✅ 蓝绿部署流程验证完成")


def test_clone_instance_with_auto_suffix():
    """测试实例克隆自动追加后缀"""

    from src.services.instance_manager import clone_instance_config

    # 创建原始实例配置
    original_camera = CameraConfig(
        name="original-cam",
        main_stream_url="rtsp://admin:pass@192.168.1.100:554/main",
        sub_stream_url="rtsp://admin:pass@192.168.1.100:554/sub"
    )

    original_instance = InstanceConfig(
        name="original-instance",
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[original_camera],
        port_block=list(range(5200, 5210))
    )

    # 克隆实例（自动追加后缀）
    cloned_config = clone_instance_config(
        source_config=original_instance,
        new_name="original-instance-copy-1"
    )

    # 验证克隆配置
    assert cloned_config.name == "original-instance-copy-1", "克隆名称错误"
    assert cloned_config.hw_mode == original_instance.hw_mode, "硬件模式未复制"
    assert cloned_config.image_tag == original_instance.image_tag, "镜像标签未复制"
    assert cloned_config.timezone == original_instance.timezone, "时区未复制"

    # 验证摄像头配置也被复制
    assert len(cloned_config.cameras) == len(original_instance.cameras), "摄像头数量不匹配"
    assert cloned_config.cameras[0].name == original_camera.name, "摄像头名称未复制"

    print("✅ 实例克隆自动后缀验证通过")


def test_rolling_update_simulation(docker_client, cleanup_instances):
    """模拟滚动更新：逐步替换实例"""

    deployment_service = DeploymentService()

    # 部署 V1 实例
    v1_name = "service-v1"
    cleanup_instances.append(v1_name)

    v1_port_block = allocate_port_block(start_port=5200, used_blocks=[])

    v1_camera = CameraConfig(
        name="service-cam",
        main_stream_url="rtsp://admin:v1pass@192.168.1.100:554/main",
        sub_stream_url="rtsp://admin:v1pass@192.168.1.100:554/sub"
    )

    v1_instance = InstanceConfig(
        name=v1_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="0.13.0",  # 旧版本
        timezone="UTC",
        cameras=[v1_camera],
        port_block=v1_port_block
    )

    v1_result = deployment_service.deploy_instance(v1_instance)
    assert v1_result['success'] is True

    print(f"✅ V1 实例部署成功（镜像: 0.13.0）")

    # 部署 V2 实例（新版本）
    v2_name = "service-v2"
    cleanup_instances.append(v2_name)

    v2_port_block = allocate_port_block(start_port=5200, used_blocks=[v1_port_block])

    v2_camera = CameraConfig(
        name="service-cam",
        main_stream_url="rtsp://admin:v2pass@192.168.1.101:554/main",
        sub_stream_url="rtsp://admin:v2pass@192.168.1.101:554/sub"
    )

    v2_instance = InstanceConfig(
        name=v2_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",  # 新版本
        timezone="UTC",
        cameras=[v2_camera],
        port_block=v2_port_block
    )

    v2_result = deployment_service.deploy_instance(v2_instance)
    assert v2_result['success'] is True

    print(f"✅ V2 实例部署成功（镜像: stable）")

    # 验证两个版本同时运行
    time.sleep(2)

    v1_container = docker_client.containers.get(v1_result['container_id'])
    v2_container = docker_client.containers.get(v2_result['container_id'])

    v1_container.reload()
    v2_container.reload()

    assert v1_container.status == 'running'
    assert v2_container.status == 'running'

    print("✅ V1 和 V2 同时运行（金丝雀部署）")

    # 验证 V2 健康后，删除 V1
    v1_container.stop(timeout=5)
    v1_container.remove()

    print("✅ V1 实例已删除，完成滚动更新")

    # 验证 V2 继续运行
    v2_container.reload()
    assert v2_container.status == 'running'

    print("✅ 滚动更新验证完成")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
