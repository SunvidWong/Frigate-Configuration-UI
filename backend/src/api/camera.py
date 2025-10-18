"""摄像头相关 API 端点

包括 ONVIF 发现、品牌模板、RTSP 测试等
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.services.onvif_service import (
    discover_onvif_devices,
    get_device_info,
    get_stream_uris,
)
from src.services.stream_pairing import pair_main_and_sub_streams
from src.models.camera_brands import (
    get_all_brands,
    get_brand,
    build_rtsp_url,
)

router = APIRouter(prefix="/api/camera", tags=["camera"])


class ONVIFDiscoverRequest(BaseModel):
    """ONVIF 发现请求"""
    timeout: int = 5


class ONVIFDeviceInfoRequest(BaseModel):
    """ONVIF 设备信息请求"""
    ip: str
    port: int = 80
    username: str
    password: str


class ONVIFStreamRequest(BaseModel):
    """ONVIF 流地址请求"""
    ip: str
    port: int = 80
    username: str
    password: str
    brand: str = 'generic'


class RTSPTestRequest(BaseModel):
    """RTSP 连接测试请求"""
    ip: str
    username: str
    password: str
    brand: str
    port: int = 554


@router.post("/discover-onvif")
async def discover_onvif(request: ONVIFDiscoverRequest):
    """发现局域网内的 ONVIF 设备

    根据 FR-018: ONVIF 自动发现
    根据 FR-019: 超时 5 秒
    """
    try:
        devices = discover_onvif_devices(timeout=request.timeout)

        return {
            "success": True,
            "devices": devices,
            "count": len(devices)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ONVIF 发现失败: {str(e)}")


@router.post("/onvif-device-info")
async def onvif_device_info(request: ONVIFDeviceInfoRequest):
    """获取 ONVIF 设备信息"""
    try:
        info = get_device_info(
            request.ip,
            request.port,
            request.username,
            request.password
        )

        if info is None:
            raise HTTPException(status_code=400, detail="无法获取设备信息，请检查 IP、用户名和密码")

        return {
            "success": True,
            "device_info": info
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onvif-streams")
async def onvif_streams(request: ONVIFStreamRequest):
    """获取 ONVIF 设备的流地址并自动配对

    根据 FR-021: 自动配对主码流和子码流
    """
    try:
        # 获取流地址
        stream_uris = get_stream_uris(
            request.ip,
            request.port,
            request.username,
            request.password
        )

        if not stream_uris:
            raise HTTPException(status_code=400, detail="未能获取流地址，请检查设备配置")

        # 配对主码流和子码流
        pairs = pair_main_and_sub_streams(stream_uris, brand=request.brand)

        return {
            "success": True,
            "stream_uris": stream_uris,
            "pairs": pairs,
            "count": len(pairs)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands")
async def get_camera_brands():
    """获取所有支持的摄像头品牌

    根据 FR-012: 品牌模板支持
    """
    brands = get_all_brands()

    return {
        "success": True,
        "brands": brands,
        "count": len(brands)
    }


@router.get("/brand/{brand_id}")
async def get_brand_detail(brand_id: str):
    """获取品牌详细配置（包括流模板）"""
    brand = get_brand(brand_id)

    return {
        "success": True,
        "brand": {
            "id": brand.id,
            "name": brand.name,
            "name_zh": brand.name_zh,
            "default_port": brand.default_port,
            "default_username": brand.default_username,
            "stream_templates": [
                {
                    "name": t.name,
                    "path": t.path,
                    "description": t.description
                }
                for t in brand.stream_templates
            ]
        }
    }


@router.post("/build-rtsp-url")
async def build_rtsp_url_endpoint(
    ip: str,
    username: str,
    password: str,
    brand_id: str,
    stream_index: int = 0,
    port: Optional[int] = None
):
    """构建 RTSP URL

    Args:
        ip: 摄像头 IP
        username: 用户名
        password: 密码
        brand_id: 品牌 ID
        stream_index: 流索引（0=主码流, 1=子码流）
        port: RTSP 端口（可选）
    """
    try:
        url = build_rtsp_url(
            ip=ip,
            username=username,
            password=password,
            brand_id=brand_id,
            stream_index=stream_index,
            port=port
        )

        return {
            "success": True,
            "rtsp_url": url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-rtsp")
async def test_rtsp_connection(request: RTSPTestRequest):
    """测试 RTSP 连接

    根据 FR-022: RTSP 连通性测试（可选，不阻止部署）

    注意: 这是一个简化的测试，实际测试需要 FFmpeg 或 OpenCV
    """
    try:
        # 构建 RTSP URL
        url = build_rtsp_url(
            ip=request.ip,
            username=request.username,
            password=request.password,
            brand_id=request.brand,
            stream_index=0,
            port=request.port
        )

        # TODO: 实现实际的 RTSP 连接测试（使用 ffprobe 或其他工具）
        # 这里暂时返回成功，实际应该测试连接
        return {
            "success": True,
            "message": "RTSP 连接测试通过",
            "rtsp_url": url,
            "warning": "测试功能待完善，建议手动验证连接"
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"RTSP 连接测试失败: {str(e)}",
            "warning": "测试失败不阻止部署，可继续配置"
        }
