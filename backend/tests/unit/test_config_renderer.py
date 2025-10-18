"""测试配置渲染服务"""
import pytest
import yaml
from src.services.config_renderer import (
    render_frigate_config,
    render_docker_compose,
)
from src.models.camera_config import (
    InstanceConfig,
    create_single_channel_camera,
    create_multi_channel_camera,
)


class TestFrigateConfigRenderer:
    """Frigate 配置渲染测试"""

    def test_render_basic_config(self):
        """测试渲染基础配置"""
        camera = create_single_channel_camera(
            name="cam1",
            ip="192.168.1.100",
            username="admin",
            password="pass123",
            brand="hikvision",
            main_stream_path="/Channels/101",
            sub_stream_path="/Channels/102"
        )

        instance = InstanceConfig(
            name="test-instance",
            hw_mode="cpu",
            cameras=[camera]
        )

        config_yaml = render_frigate_config(instance)

        # 解析生成的 YAML
        config = yaml.safe_load(config_yaml)

        assert 'cameras' in config
        assert 'detectors' in config
        assert 'database' in config
        assert 'record' in config

    def test_render_config_with_cpu_detector(self):
        """测试 CPU 检测器配置"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="test",
            hw_mode="cpu",
            cameras=[camera]
        )

        config_yaml = render_frigate_config(instance)
        config = yaml.safe_load(config_yaml)

        assert 'cpu' in config['detectors']
        assert config['detectors']['cpu']['type'] == 'cpu'

    def test_render_config_with_nvidia_detector(self):
        """测试 NVIDIA 检测器配置 - FR-026"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="test",
            hw_mode="nvidia",
            cameras=[camera]
        )

        config_yaml = render_frigate_config(instance)
        config = yaml.safe_load(config_yaml)

        assert 'coral' in config['detectors']

    def test_render_config_multi_camera(self):
        """测试多摄像头配置"""
        cam1 = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        cam2 = create_single_channel_camera(
            name="cam2", ip="192.168.1.101",
            username="admin", password="pass",
            brand="dahua", main_stream_path="/stream"
        )

        instance = InstanceConfig(
            name="test",
            cameras=[cam1, cam2]
        )

        config_yaml = render_frigate_config(instance)
        config = yaml.safe_load(config_yaml)

        assert len(config['cameras']) == 2
        assert 'cam1-ch1' in config['cameras']
        assert 'cam2-ch1' in config['cameras']

    def test_render_config_multi_channel(self):
        """测试多通道配置 - FR-023"""
        stream_pairs = [
            {"main": "/Channels/101", "sub": "/Channels/102"},
            {"main": "/Channels/201", "sub": "/Channels/202"},
        ]

        camera = create_multi_channel_camera(
            name="cam-multi",
            ip="192.168.1.100",
            username="admin",
            password="pass",
            brand="hikvision",
            stream_pairs=stream_pairs
        )

        instance = InstanceConfig(
            name="test",
            cameras=[camera]
        )

        config_yaml = render_frigate_config(instance)
        config = yaml.safe_load(config_yaml)

        # 应该有 2 个通道
        assert len(config['cameras']) == 2
        assert 'cam-multi-ch1' in config['cameras']
        assert 'cam-multi-ch2' in config['cameras']

    def test_camera_has_rtsp_url(self):
        """测试摄像头配置包含完整 RTSP URL"""
        camera = create_single_channel_camera(
            name="cam1",
            ip="192.168.1.100",
            username="admin",
            password="pass123",
            brand="hikvision",
            main_stream_path="/Channels/101"
        )

        instance = InstanceConfig(name="test", cameras=[camera])
        config_yaml = render_frigate_config(instance)
        config = yaml.safe_load(config_yaml)

        camera_config = config['cameras']['cam1-ch1']
        input_path = camera_config['ffmpeg']['inputs'][0]['path']

        assert 'rtsp://' in input_path
        assert '192.168.1.100' in input_path
        assert '/Channels/101' in input_path


class TestDockerComposeRenderer:
    """Docker Compose 配置渲染测试"""

    def test_render_docker_compose_basic(self):
        """测试渲染基础 docker-compose 配置"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="test-instance",
            cameras=[camera],
            port_block=list(range(5200, 5210))
        )

        compose_yaml = render_docker_compose(instance)
        compose = yaml.safe_load(compose_yaml)

        assert 'services' in compose
        assert 'frigate-instance-test-instance' in compose['services']

        service = compose['services']['frigate-instance-test-instance']
        assert service['image'] == 'ghcr.io/blakeblackshear/frigate:stable'
        assert service['restart'] == 'no'  # FR-003

    def test_render_docker_compose_with_ports(self):
        """测试端口映射配置 - FR-028"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="test",
            cameras=[camera],
            port_block=list(range(5200, 5210))
        )

        compose_yaml = render_docker_compose(instance)
        compose = yaml.safe_load(compose_yaml)

        service = compose['services']['frigate-instance-test']
        assert 'ports' in service
        assert '5200:5000' in service['ports']  # WebUI

    def test_render_docker_compose_nvidia(self):
        """测试 NVIDIA 运行时配置"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="test",
            hw_mode="nvidia",
            cameras=[camera]
        )

        compose_yaml = render_docker_compose(instance)
        compose = yaml.safe_load(compose_yaml)

        service = compose['services']['frigate-instance-test']
        assert service.get('runtime') == 'nvidia'
        assert 'NVIDIA_VISIBLE_DEVICES' in service['environment']

    def test_render_docker_compose_volumes(self):
        """测试卷挂载配置"""
        camera = create_single_channel_camera(
            name="cam1", ip="192.168.1.100",
            username="admin", password="pass",
            brand="hikvision", main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="my-instance",
            cameras=[camera]
        )

        compose_yaml = render_docker_compose(instance)
        compose = yaml.safe_load(compose_yaml)

        service = compose['services']['frigate-instance-my-instance']
        assert len(service['volumes']) >= 2

        # 检查配置和媒体卷
        config_volume = f'./data/instances/my-instance/config:/config'
        media_volume = f'./data/instances/my-instance/media:/media/frigate'

        assert config_volume in service['volumes']
        assert media_volume in service['volumes']
