"""
实例隔离测试

测试场景: C-DoD-4
- 创建 3 个实例
- 删除中间实例
- 验证其他实例不受影响继续运行
- 验证端口块已释放
"""

import pytest
import docker
import time
from pathlib import Path
import shutil

from src.models.camera_config import CameraConfig, InstanceConfig
from src.services.deployment_service import DeploymentService
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


def test_delete_middle_instance_isolation(docker_client, cleanup_instances):
    """测试删除中间实例不影响其他实例"""

    deployment_service = DeploymentService()
    deployed_instances = []

    # 1. 部署 3 个实例
    instance_names = ["instance-alpha", "instance-beta", "instance-gamma"]

    for idx, instance_name in enumerate(instance_names):
        cleanup_instances.append(instance_name)

        # 分配端口块
        used_blocks = [inst['port_block'] for inst in deployed_instances]
        port_block = allocate_port_block(start_port=5200, used_blocks=used_blocks)

        expected_port = 5200 + (idx * 10)
        assert port_block[0] == expected_port, f"{instance_name} 端口分配错误"

        # 创建摄像头配置
        camera = CameraConfig(
            name=f"{instance_name}-cam",
            main_stream_url=f"rtsp://admin:pass@192.168.1.{100+idx}:554/main",
            sub_stream_url=f"rtsp://admin:pass@192.168.1.{100+idx}:554/sub"
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

        # 部署实例
        result = deployment_service.deploy_instance(instance)
        assert result['success'] is True, f"{instance_name} 部署失败"

        deployed_instances.append({
            'name': instance_name,
            'container_id': result['container_id'],
            'port_block': port_block,
            'expected_port': expected_port
        })

        print(f"✅ {instance_name} 部署成功，端口块: {port_block[0]}-{port_block[-1]}")

    # 2. 验证所有实例运行
    time.sleep(3)

    for inst in deployed_instances:
        container = docker_client.containers.get(inst['container_id'])
        container.reload()
        assert container.status == 'running', f"{inst['name']} 未运行"

    print("✅ 3 个实例全部运行")

    # 3. 删除中间实例（instance-beta, 端口 5210-5219）
    middle_instance = deployed_instances[1]

    print(f"⚠️  准备删除中间实例 '{middle_instance['name']}'...")

    # 停止并删除容器
    middle_container = docker_client.containers.get(middle_instance['container_id'])
    middle_container.stop(timeout=5)
    middle_container.remove()

    # 删除数据目录
    middle_data_dir = Path(f"/data/instances/{middle_instance['name']}")
    if middle_data_dir.exists():
        shutil.rmtree(middle_data_dir)

    print(f"✅ 中间实例 '{middle_instance['name']}' 已删除")

    # 4. 验证其他实例继续运行
    time.sleep(1)

    for idx, inst in enumerate(deployed_instances):
        if idx == 1:  # 跳过已删除的中间实例
            continue

        container = docker_client.containers.get(inst['container_id'])
        container.reload()

        assert container.status == 'running', f"{inst['name']} 受到删除影响，状态: {container.status}"

        # 验证端口映射仍然有效
        ports = container.attrs['NetworkSettings']['Ports']
        mapped_port = int(ports['5000/tcp'][0]['HostPort'])
        assert mapped_port == inst['expected_port'], f"{inst['name']} 端口映射改变"

        print(f"✅ {inst['name']} 继续运行，端口 {mapped_port}")

    # 5. 验证配置文件隔离
    for idx, inst in enumerate(deployed_instances):
        if idx == 1:  # 中间实例的配置应该被删除
            config_path = Path(f"/data/instances/{inst['name']}/config/config.yml")
            assert not config_path.exists(), f"{inst['name']} 配置文件未删除"
        else:  # 其他实例的配置应该保留
            config_path = Path(f"/data/instances/{inst['name']}/config/config.yml")
            assert config_path.exists(), f"{inst['name']} 配置文件被误删除"

    print("✅ 配置文件隔离验证通过")

    # 6. 验证端口块释放（可以重新分配 5210-5219）
    released_port_block = middle_instance['port_block']

    # 模拟新实例分配，应该可以复用释放的端口块
    remaining_used_blocks = [
        deployed_instances[0]['port_block'],  # instance-alpha: 5200-5209
        deployed_instances[2]['port_block'],  # instance-gamma: 5220-5229
    ]

    # 新实例应该能分配到 5210-5219（已释放的端口块）
    new_port_block = allocate_port_block(start_port=5200, used_blocks=remaining_used_blocks)

    # 注意：allocate_port_block 会从起始端口顺序查找，所以应该分配到 5210
    assert new_port_block == list(range(5210, 5220)), f"端口块释放验证失败: {new_port_block}"

    print(f"✅ 端口块 {released_port_block[0]}-{released_port_block[-1]} 已释放，可重新分配")


def test_cascading_delete_all_instances(docker_client, cleanup_instances):
    """测试级联删除所有实例"""

    deployment_service = DeploymentService()
    deployed_instances = []

    # 部署 3 个实例
    for i in range(3):
        instance_name = f"cascade-{i}"
        cleanup_instances.append(instance_name)

        used_blocks = [inst['port_block'] for inst in deployed_instances]
        port_block = allocate_port_block(start_port=5200, used_blocks=used_blocks)

        camera = CameraConfig(
            name=f"cam-{i}",
            main_stream_url=f"rtsp://admin:pass@192.168.1.{100+i}:554/main",
            sub_stream_url=f"rtsp://admin:pass@192.168.1.{100+i}:554/sub"
        )

        instance = InstanceConfig(
            name=instance_name,
            hw_mode="cpu",
            hw_device="",
            image_tag="stable",
            timezone="UTC",
            cameras=[camera],
            port_block=port_block
        )

        result = deployment_service.deploy_instance(instance)
        deployed_instances.append({
            'name': instance_name,
            'container_id': result['container_id'],
        })

    print(f"✅ 部署了 {len(deployed_instances)} 个实例")

    # 逐个删除实例（从后往前）
    for inst in reversed(deployed_instances):
        container = docker_client.containers.get(inst['container_id'])
        container.stop(timeout=5)
        container.remove()

        data_dir = Path(f"/data/instances/{inst['name']}")
        if data_dir.exists():
            shutil.rmtree(data_dir)

        print(f"✅ 删除实例 '{inst['name']}'")

    # 验证所有实例已删除
    for inst in deployed_instances:
        with pytest.raises(docker.errors.NotFound):
            docker_client.containers.get(inst['container_id'])

    print("✅ 所有实例已删除")


def test_instance_data_isolation(docker_client, cleanup_instances):
    """测试实例数据隔离"""

    deployment_service = DeploymentService()

    # 部署两个实例，使用相同名称的摄像头
    instance1_name = "data-iso-1"
    instance2_name = "data-iso-2"

    cleanup_instances.extend([instance1_name, instance2_name])

    port_block1 = allocate_port_block(start_port=5200, used_blocks=[])
    port_block2 = allocate_port_block(start_port=5200, used_blocks=[port_block1])

    # 两个实例都有名为 "test-camera" 的摄像头，但配置不同
    camera1 = CameraConfig(
        name="test-camera",
        main_stream_url="rtsp://admin:pass1@192.168.1.100:554/main",
        sub_stream_url="rtsp://admin:pass1@192.168.1.100:554/sub"
    )

    camera2 = CameraConfig(
        name="test-camera",  # 同名摄像头
        main_stream_url="rtsp://admin:pass2@192.168.1.101:554/main",  # 不同配置
        sub_stream_url="rtsp://admin:pass2@192.168.1.101:554/sub"
    )

    instance1 = InstanceConfig(
        name=instance1_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[camera1],
        port_block=port_block1
    )

    instance2 = InstanceConfig(
        name=instance2_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="UTC",
        cameras=[camera2],
        port_block=port_block2
    )

    # 部署两个实例
    result1 = deployment_service.deploy_instance(instance1)
    result2 = deployment_service.deploy_instance(instance2)

    assert result1['success'] and result2['success']

    # 验证数据目录隔离
    import yaml

    config1_path = Path(f"/data/instances/{instance1_name}/config/config.yml")
    config2_path = Path(f"/data/instances/{instance2_name}/config/config.yml")

    with open(config1_path, 'r', encoding='utf-8') as f:
        config1 = yaml.safe_load(f)

    with open(config2_path, 'r', encoding='utf-8') as f:
        config2 = yaml.safe_load(f)

    # 验证摄像头配置不同
    cam1_url = config1['cameras']['test-camera']['ffmpeg']['inputs'][0]['path']
    cam2_url = config2['cameras']['test-camera']['ffmpeg']['inputs'][0]['path']

    assert '192.168.1.100' in cam1_url, "实例 1 摄像头 IP 错误"
    assert '192.168.1.101' in cam2_url, "实例 2 摄像头 IP 错误"

    print("✅ 实例数据隔离验证通过：同名摄像头配置不冲突")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
