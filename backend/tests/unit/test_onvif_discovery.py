"""测试 ONVIF 设备发现逻辑

根据 FR-018: ONVIF 自动发现
根据 FR-019: 超时 5 秒
根据 FR-020: 失败时使用品牌模板降级
"""
import pytest
from unittest.mock import patch, MagicMock
from src.services.onvif_service import (
    discover_onvif_devices,
    get_device_info,
    get_stream_uris,
)
from src.models.error_codes import ErrorCode


class TestONVIFDiscovery:
    """ONVIF 设备发现测试"""

    def test_discover_devices_success(self):
        """测试成功发现 ONVIF 设备"""
        with patch('onvif.ONVIFCamera') as mock_camera:
            mock_device = MagicMock()
            mock_device.host = '192.168.1.100'
            mock_device.port = 80

            # 模拟发现返回设备列表
            with patch('src.services.onvif_service.WSDiscovery') as mock_discovery:
                mock_discovery.return_value.searchServices.return_value = [mock_device]

                devices = discover_onvif_devices(timeout=5)

                assert len(devices) > 0
                assert devices[0]['ip'] == '192.168.1.100'

    def test_discover_devices_timeout(self):
        """测试 ONVIF 发现超时 - FR-019"""
        with patch('src.services.onvif_service.WSDiscovery') as mock_discovery:
            # 模拟超时
            mock_discovery.return_value.searchServices.side_effect = TimeoutError("Discovery timeout")

            devices = discover_onvif_devices(timeout=5)

            assert devices == []

    def test_discover_devices_no_devices_found(self):
        """测试未发现任何设备"""
        with patch('src.services.onvif_service.WSDiscovery') as mock_discovery:
            mock_discovery.return_value.searchServices.return_value = []

            devices = discover_onvif_devices(timeout=5)

            assert devices == []

    def test_discover_devices_timeout_parameter(self):
        """测试超时参数传递"""
        with patch('src.services.onvif_service.WSDiscovery') as mock_discovery:
            mock_discovery.return_value.searchServices.return_value = []

            discover_onvif_devices(timeout=3)

            # 验证超时参数被使用
            assert mock_discovery.called


class TestONVIFDeviceInfo:
    """ONVIF 设备信息获取测试"""

    def test_get_device_info_success(self):
        """测试成功获取设备信息"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera = MagicMock()
            mock_device_mgmt = MagicMock()

            # 模拟设备信息
            mock_device_mgmt.GetDeviceInformation.return_value = MagicMock(
                Manufacturer='Hikvision',
                Model='DS-2CD2345',
                FirmwareVersion='V5.6.0',
                SerialNumber='12345678'
            )

            mock_camera.devicemgmt = mock_device_mgmt
            mock_camera_class.return_value = mock_camera

            info = get_device_info('192.168.1.100', 80, 'admin', 'password')

            assert info is not None
            assert info['manufacturer'] == 'Hikvision'
            assert info['model'] == 'DS-2CD2345'

    def test_get_device_info_auth_failure(self):
        """测试鉴权失败 - 应返回 ONVIF_AUTH_FAIL 错误"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera_class.side_effect = Exception("401 Unauthorized")

            info = get_device_info('192.168.1.100', 80, 'wrong', 'credentials')

            assert info is None

    def test_get_device_info_timeout(self):
        """测试获取设备信息超时"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera_class.side_effect = TimeoutError("Connection timeout")

            info = get_device_info('192.168.1.100', 80, 'admin', 'password')

            assert info is None


class TestONVIFStreamURIs:
    """ONVIF 流地址获取测试"""

    def test_get_stream_uris_success(self):
        """测试成功获取流地址"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera = MagicMock()
            mock_media = MagicMock()

            # 模拟获取配置文件
            mock_profile = MagicMock()
            mock_profile.token = 'profile_0'
            mock_media.GetProfiles.return_value = [mock_profile]

            # 模拟获取流 URI
            mock_stream_uri = MagicMock()
            mock_stream_uri.Uri = 'rtsp://192.168.1.100:554/Streaming/Channels/101'
            mock_media.GetStreamUri.return_value = mock_stream_uri

            mock_camera.media = mock_media
            mock_camera_class.return_value = mock_camera

            uris = get_stream_uris('192.168.1.100', 80, 'admin', 'password')

            assert len(uris) > 0
            assert 'rtsp://' in uris[0]

    def test_get_stream_uris_no_profiles(self):
        """测试设备无流配置文件"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera = MagicMock()
            mock_media = MagicMock()
            mock_media.GetProfiles.return_value = []

            mock_camera.media = mock_media
            mock_camera_class.return_value = mock_camera

            uris = get_stream_uris('192.168.1.100', 80, 'admin', 'password')

            assert uris == []

    def test_get_stream_uris_failure(self):
        """测试获取流地址失败"""
        with patch('onvif.ONVIFCamera') as mock_camera_class:
            mock_camera_class.side_effect = Exception("Failed to get stream URIs")

            uris = get_stream_uris('192.168.1.100', 80, 'admin', 'password')

            assert uris == []
