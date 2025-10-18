"""测试摄像头配置模型"""
import pytest
from pydantic import ValidationError
from src.models.camera_config import (
    CameraConfig,
    ChannelConfig,
    StreamConfig,
    InstanceConfig,
    create_single_channel_camera,
    create_multi_channel_camera,
)


class TestStreamConfig:
    """流配置测试"""

    def test_create_stream_config(self):
        """测试创建流配置"""
        stream = StreamConfig(path="/Streaming/Channels/101")

        assert stream.path == "/Streaming/Channels/101"
        assert stream.enabled is True

    def test_stream_config_disabled(self):
        """测试禁用流"""
        stream = StreamConfig(path="/stream", enabled=False)

        assert stream.enabled is False


class TestChannelConfig:
    """通道配置测试"""

    def test_create_channel_with_main_stream(self):
        """测试创建仅主码流的通道"""
        main_stream = StreamConfig(path="/main")
        channel = ChannelConfig(
            name="front-ch1",
            main_stream=main_stream
        )

        assert channel.name == "front-ch1"
        assert channel.main_stream.path == "/main"
        assert channel.sub_stream is None

    def test_create_channel_with_sub_stream(self):
        """测试创建有子码流的通道"""
        main_stream = StreamConfig(path="/main")
        sub_stream = StreamConfig(path="/sub")
        channel = ChannelConfig(
            name="front-ch1",
            main_stream=main_stream,
            sub_stream=sub_stream
        )

        assert channel.sub_stream.path == "/sub"

    def test_invalid_channel_name(self):
        """测试无效的通道名称"""
        main_stream = StreamConfig(path="/main")

        with pytest.raises(ValidationError):
            ChannelConfig(
                name="Invalid-Name",  # 大写字母无效
                main_stream=main_stream
            )


class TestCameraConfig:
    """摄像头配置测试"""

    def test_create_camera_single_channel(self):
        """测试创建单通道摄像头"""
        camera = create_single_channel_camera(
            name="cam-front",
            ip="192.168.1.100",
            username="admin",
            password="pass123",
            brand="hikvision",
            main_stream_path="/Channels/101",
            sub_stream_path="/Channels/102"
        )

        assert camera.name == "cam-front"
        assert camera.ip == "192.168.1.100"
        assert len(camera.channels) == 1
        assert camera.channels[0].name == "cam-front-ch1"

    def test_create_camera_multi_channel(self):
        """测试创建多通道摄像头 - FR-023"""
        stream_pairs = [
            {"main": "/Channels/101", "sub": "/Channels/102"},
            {"main": "/Channels/201", "sub": "/Channels/202"},
        ]

        camera = create_multi_channel_camera(
            name="cam-multi",
            ip="192.168.1.100",
            username="admin",
            password="pass123",
            brand="hikvision",
            stream_pairs=stream_pairs
        )

        assert len(camera.channels) == 2
        assert camera.channels[0].name == "cam-multi-ch1"
        assert camera.channels[1].name == "cam-multi-ch2"
        assert camera.channels[0].main_stream.path == "/Channels/101"

    def test_camera_invalid_name(self):
        """测试无效的摄像头名称"""
        with pytest.raises(ValidationError):
            CameraConfig(
                name="Cam",  # 过短且大写
                ip="192.168.1.100",
                username="admin",
                password="pass"
            )


class TestInstanceConfig:
    """实例配置测试"""

    def test_create_instance_config(self):
        """测试创建实例配置"""
        camera = create_single_channel_camera(
            name="cam1",
            ip="192.168.1.100",
            username="admin",
            password="pass",
            brand="hikvision",
            main_stream_path="/101"
        )

        instance = InstanceConfig(
            name="instance-test",
            hw_mode="nvidia",
            cameras=[camera],
            port_block=list(range(5200, 5210))
        )

        assert instance.name == "instance-test"
        assert instance.hw_mode == "nvidia"
        assert len(instance.cameras) == 1
        assert len(instance.port_block) == 10

    def test_instance_multiple_cameras(self):
        """测试包含多个摄像头的实例"""
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
            name="multi-cam",
            cameras=[cam1, cam2]
        )

        assert len(instance.cameras) == 2

    def test_instance_invalid_name(self):
        """测试无效的实例名称"""
        with pytest.raises(ValidationError):
            InstanceConfig(
                name="AB",  # 过短
                cameras=[]
            )
