"""ONVIF 设备发现与配置服务

根据 FR-018: ONVIF 自动发现
根据 FR-019: 超时 5 秒
根据 FR-020: 失败时降级到品牌模板
"""
from typing import List, Dict, Optional
import logging
from onvif import ONVIFCamera
from src.models.error_codes import ErrorCode, format_error, format_warning

logger = logging.getLogger(__name__)

# 默认 ONVIF 发现超时时间（秒）
DEFAULT_DISCOVERY_TIMEOUT = 5


def discover_onvif_devices(timeout: int = DEFAULT_DISCOVERY_TIMEOUT) -> List[Dict]:
    """发现局域网内的 ONVIF 设备

    Args:
        timeout: 发现超时时间（秒），默认 5 秒

    Returns:
        List[Dict]: 发现的设备列表，每个设备包含 ip, port 等信息

    根据 FR-019: 超时 5 秒
    """
    devices = []

    try:
        # 使用 WS-Discovery 协议发现设备
        from wsdiscovery.discovery import ThreadedWSDiscovery as WSDiscovery

        wsd = WSDiscovery()
        wsd.start()

        # 搜索 ONVIF 设备
        services = wsd.searchServices(timeout=timeout)

        for service in services:
            # 提取设备信息
            device_info = {
                'ip': _extract_ip_from_xaddr(service.getXAddrs()[0]) if service.getXAddrs() else None,
                'port': 80,  # 默认 ONVIF 端口
                'types': [str(t) for t in service.getTypes()],
                'scopes': [str(s) for s in service.getScopes()] if service.getScopes() else [],
            }

            if device_info['ip']:
                devices.append(device_info)

        wsd.stop()

        logger.info(f"[ONVIF] 发现 {len(devices)} 个设备")
        return devices

    except TimeoutError:
        warning_msg = format_warning(ErrorCode.ONVIF_TIMEOUT)
        print(warning_msg, flush=True)
        return []

    except Exception as e:
        logger.error(f"[ONVIF] 发现失败: {e}")
        return []


def get_device_info(
    ip: str,
    port: int,
    username: str,
    password: str
) -> Optional[Dict]:
    """获取 ONVIF 设备信息

    Args:
        ip: 设备 IP 地址
        port: ONVIF 端口，通常为 80
        username: 用户名
        password: 密码

    Returns:
        Optional[Dict]: 设备信息字典，失败返回 None
    """
    try:
        camera = ONVIFCamera(ip, port, username, password)

        # 获取设备管理服务
        device_mgmt = camera.devicemgmt

        # 获取设备信息
        device_info = device_mgmt.GetDeviceInformation()

        return {
            'manufacturer': device_info.Manufacturer,
            'model': device_info.Model,
            'firmware': device_info.FirmwareVersion,
            'serial': device_info.SerialNumber,
        }

    except Exception as e:
        if '401' in str(e) or 'Unauthorized' in str(e):
            error_msg = format_error(ErrorCode.ONVIF_AUTH_FAIL, ip=ip)
            print(error_msg, flush=True)
        else:
            logger.error(f"[ONVIF] 获取设备信息失败 ({ip}): {e}")

        return None


def get_stream_uris(
    ip: str,
    port: int,
    username: str,
    password: str
) -> List[str]:
    """获取 ONVIF 设备的 RTSP 流地址

    Args:
        ip: 设备 IP 地址
        port: ONVIF 端口
        username: 用户名
        password: 密码

    Returns:
        List[str]: RTSP 流地址列表
    """
    try:
        camera = ONVIFCamera(ip, port, username, password)

        # 获取媒体服务
        media_service = camera.media

        # 获取所有配置文件
        profiles = media_service.GetProfiles()

        stream_uris = []

        for profile in profiles:
            # 获取流 URI
            stream_uri = media_service.GetStreamUri({
                'StreamSetup': {
                    'Stream': 'RTP-Unicast',
                    'Transport': {'Protocol': 'RTSP'}
                },
                'ProfileToken': profile.token
            })

            if hasattr(stream_uri, 'Uri'):
                stream_uris.append(stream_uri.Uri)

        logger.info(f"[ONVIF] 从 {ip} 获取到 {len(stream_uris)} 个流地址")
        return stream_uris

    except Exception as e:
        logger.error(f"[ONVIF] 获取流地址失败 ({ip}): {e}")
        return []


def _extract_ip_from_xaddr(xaddr: str) -> Optional[str]:
    """从 ONVIF XAddr 中提取 IP 地址

    Args:
        xaddr: XAddr 字符串，如 "http://192.168.1.100:80/onvif/device_service"

    Returns:
        Optional[str]: IP 地址，提取失败返回 None
    """
    try:
        # 移除协议前缀
        if '://' in xaddr:
            xaddr = xaddr.split('://')[1]

        # 提取 IP:port 部分
        if '/' in xaddr:
            xaddr = xaddr.split('/')[0]

        # 提取 IP（移除端口）
        if ':' in xaddr:
            ip = xaddr.split(':')[0]
        else:
            ip = xaddr

        return ip

    except Exception:
        return None
