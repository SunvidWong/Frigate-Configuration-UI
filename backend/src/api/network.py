"""
网络相关 API

提供网络接口检测和网络信息查询功能。
用于前端显示正确的宿主机网络信息，并用于 ONVIF 扫描。

修复问题 #FIX-001: Docker 模式下网络检测错误
"""

from fastapi import APIRouter
from typing import List, Dict

from ..services.network_detector import (
    get_network_interfaces,
    get_default_network,
    get_network_info_for_onvif
)


router = APIRouter(prefix="/api/network", tags=["network"])


@router.get("/interfaces")
async def list_network_interfaces() -> Dict:
    """
    获取所有网络接口

    Returns:
        {
            "success": true,
            "interfaces": [
                {
                    "interface": "eth0",
                    "ip": "10.10.0.129",
                    "netmask": "255.255.255.0",
                    "network": "10.10.0.0/24",
                    "is_default": true
                }
            ],
            "default": {
                "interface": "eth0",
                "ip": "10.10.0.129",
                "netmask": "255.255.255.0",
                "network": "10.10.0.0/24"
            },
            "count": 1
        }
    """
    try:
        interfaces = get_network_interfaces()
        default = get_default_network()

        return {
            "success": True,
            "interfaces": interfaces,
            "default": default,
            "count": len(interfaces)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "interfaces": [],
            "default": None,
            "count": 0
        }


@router.get("/default")
async def get_default_network_info() -> Dict:
    """
    获取默认网络接口信息

    Returns:
        {
            "success": true,
            "network": {
                "interface": "eth0",
                "ip": "10.10.0.129",
                "netmask": "255.255.255.0",
                "network": "10.10.0.0/24",
                "is_default": true
            }
        }
    """
    try:
        default = get_default_network()

        return {
            "success": True,
            "network": default
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "network": None
        }


@router.get("/onvif-scan-info")
async def get_onvif_scan_info() -> Dict:
    """
    获取用于 ONVIF 扫描的网络信息

    包含广播地址等额外信息。

    Returns:
        {
            "success": true,
            "info": {
                "ip": "10.10.0.129",
                "network": "10.10.0.0/24",
                "broadcast": "10.10.0.255",
                "interface": "eth0"
            }
        }
    """
    try:
        info = get_network_info_for_onvif()

        return {
            "success": True,
            "info": info
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "info": None
        }
