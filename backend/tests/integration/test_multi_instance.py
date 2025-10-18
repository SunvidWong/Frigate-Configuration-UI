"""
多实例并存测试

测试场景: C-DoD-2
- 部署 2 个实例 ("front-door", "backyard")
- 验证端口不冲突 (5200-5209, 5210-5219)
- 验证两个实例同时运行
"""

import pytest
import docker
import time
from pathlib import Path

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
            import shutil
            shutil.rmtree(instance_dir)


def test_multi_instance_coexistence(docker_client, cleanup_instances):
    """测试多实例并存"""

    deployment_service = DeploymentService()

    # 1. 部署第一个实例 "front-door"
    instance1_name = "front-door"
    cleanup_instances.append(instance1_name)

    port_block1 = allocate_port_block(start_port=5200, used_blocks=[])
    assert port_block1 == list(range(5200, 5210)), f"第一个实例端口块错误: {port_block1}"

    camera1 = CameraConfig(
        name="front-camera",
        main_stream_url="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101",
        sub_stream_url="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/102"
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

    result1 = deployment_service.deploy_instance(instance1)
    assert result1['success'] is True, "第一个实例部署失败"

    container1 = docker_client.containers.get(result1['container_id'])
    print(f"✅ 实例 1 '{instance1_name}' 部署成功，容器 ID: {result1['container_id'][:12]}")

    # 2. 部署第二个实例 "backyard"
    instance2_name = "backyard"
    cleanup_instances.append(instance2_name)

    # 分配第二个端口块（应该自动顺延到 5210-5219）
    port_block2 = allocate_port_block(start_port=5200, used_blocks=[port_block1])
    assert port_block2 == list(range(5210, 5220)), f"第二个实例端口块错误: {port_block2}"

    camera2 = CameraConfig(
        name="back-camera",
        main_stream_url="rtsp://admin:pass@192.168.1.101:554/cam/realmonitor?channel=1&subtype=0",
        sub_stream_url="rtsp://admin:pass@192.168.1.101:554/cam/realmonitor?channel=1&subtype=1"
    )

    instance2 = InstanceConfig(
        name=instance2_name,
        hw_mode="cpu",
        hw_device="",
        image_tag="stable",
        timezone="Asia/Shanghai",
        cameras=[camera2],
        port_block=port_block2
    )

    result2 = deployment_service.deploy_instance(instance2)
    assert result2['success'] is True, "第二个实例部署失败"

    container2 = docker_client.containers.get(result2['container_id'])
    print(f"✅ 实例 2 '{instance2_name}' 部署成功，容器 ID: {result2['container_id'][:12]}")

    # 3. 验证端口不冲突
    ports1 = container1.attrs['NetworkSettings']['Ports']
    ports2 = container2.attrs['NetworkSettings']['Ports']

    port1_ui = int(ports1['5000/tcp'][0]['HostPort'])
    port2_ui = int(ports2['5000/tcp'][0]['HostPort'])

    assert port1_ui == 5200, f"实例 1 UI 端口错误: {port1_ui}"
    assert port2_ui == 5210, f"实例 2 UI 端口错误: {port2_ui}"

    print(f"✅ 端口分配正确: 实例 1 = {port1_ui}, 实例 2 = {port2_ui}")

    # 4. 验证两个实例同时运行
    time.sleep(2)  # 等待容器启动

    container1.reload()
    container2.reload()

    assert container1.status == 'running', f"实例 1 状态异常: {container1.status}"
    assert container2.status == 'running', f"实例 2 状态异常: {container2.status}"

    print("✅ 两个实例同时运行")

    # 5. 验证配置文件隔离
    config1_path = Path(f"/data/instances/{instance1_name}/config/config.yml")
    config2_path = Path(f"/data/instances/{instance2_name}/config/config.yml")

    assert config1_path.exists(), "实例 1 配置文件不存在"
    assert config2_path.exists(), "实例 2 配置文件不存在"

    # 6. 停止实例 1，验证实例 2 继续运行
    container1.stop(timeout=5)
    time.sleep(1)

    container1.reload()
    container2.reload()

    assert container1.status == 'exited', "实例 1 应该已停止"
    assert container2.status == 'running', "实例 2 应该继续运行"

    print("✅ 实例隔离验证通过：停止实例 1 不影响实例 2")


def test_port_block_allocation_skip_occupied():
    """测试端口块分配跳过已占用端口"""

    # 模拟已使用的端口块
    used_blocks = [
        list(range(5200, 5210)),  # 第一个块
        list(range(5210, 5220)),  # 第二个块
    ]

    # 分配新端口块应该跳到 5220-5229
    new_block = allocate_port_block(start_port=5200, used_blocks=used_blocks)

    assert new_block == list(range(5220, 5230)), f"端口块分配错误: {new_block}"
    print(f"✅ 端口块自动顺延验证通过: {new_block}")


def test_three_instances_coexistence(docker_client, cleanup_instances):
    """测试三个实例并存"""

    deployment_service = DeploymentService()
    deployed_instances = []

    # 部署三个实例
    instance_configs = [
        ("instance-a", 5200),
        ("instance-b", 5210),
        ("instance-c", 5220),
    ]

    for instance_name, expected_port in instance_configs:
        cleanup_instances.append(instance_name)

        # 计算已使用的端口块
        used_blocks = [inst['port_block'] for inst in deployed_instances]

        port_block = allocate_port_block(start_port=5200, used_blocks=used_blocks)
        assert port_block[0] == expected_port, f"{instance_name} 端口分配错误"

        camera = CameraConfig(
            name=f"{instance_name}-cam",
            main_stream_url=f"rtsp://admin:pass@192.168.1.10{len(deployed_instances)}:554/main",
            sub_stream_url=f"rtsp://admin:pass@192.168.1.10{len(deployed_instances)}:554/sub"
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
        assert result['success'] is True, f"{instance_name} 部署失败"

        deployed_instances.append({
            'name': instance_name,
            'container_id': result['container_id'],
            'port_block': port_block
        })

        print(f"✅ {instance_name} 部署成功，端口块: {port_block[0]}-{port_block[-1]}")

    # 验证所有实例同时运行
    time.sleep(3)

    for inst in deployed_instances:
        container = docker_client.containers.get(inst['container_id'])
        container.reload()
        assert container.status == 'running', f"{inst['name']} 未运行"

    print("✅ 三个实例同时运行验证通过")

    # 删除中间实例
    middle_instance = deployed_instances[1]
    middle_container = docker_client.containers.get(middle_instance['container_id'])
    middle_container.stop(timeout=5)
    middle_container.remove()

    print(f"✅ 删除中间实例 '{middle_instance['name']}'")

    # 验证其他实例继续运行
    time.sleep(1)

    for i, inst in enumerate(deployed_instances):
        if i == 1:  # 跳过已删除的实例
            continue

        container = docker_client.containers.get(inst['container_id'])
        container.reload()
        assert container.status == 'running', f"{inst['name']} 受到删除影响"

    print("✅ 删除中间实例不影响其他实例")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
