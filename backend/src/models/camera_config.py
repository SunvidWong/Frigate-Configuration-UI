"""摄像头配置模型

根据 FR-023: 多通道支持（一个摄像头可有多个通道）
根据 FR-024: 每个通道独立配置主码流和子码流
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class StreamConfig(BaseModel):
    """流配置"""
    path: str = Field(..., description="RTSP 路径")
    enabled: bool = Field(default=True, description="是否启用")


class ChannelConfig(BaseModel):
    """通道配置

    每个通道可以有独立的主码流和子码流
    """
    name: str = Field(..., description="通道名称", pattern=r'^[a-z][a-z0-9-]{2,31}$')
    main_stream: StreamConfig = Field(..., description="主码流配置")
    sub_stream: Optional[StreamConfig] = Field(None, description="子码流配置")
    enabled: bool = Field(default=True, description="是否启用该通道")
    detect_enabled: bool = Field(default=True, description="是否启用目标检测")
    record_enabled: bool = Field(default=True, description="是否启用录像")


class CameraConfig(BaseModel):
    """摄像头配置

    根据 FR-023: 支持多通道
    """
    name: str = Field(..., description="摄像头名称", pattern=r'^[a-z][a-z0-9-]{2,31}$')
    ip: str = Field(..., description="摄像头 IP 地址")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    brand: str = Field(default="generic", description="摄像头品牌")
    port: int = Field(default=554, description="RTSP 端口")

    # 多通道配置
    channels: List[ChannelConfig] = Field(
        default_factory=list,
        description="通道列表（支持多通道）"
    )

    # 元数据
    onvif_port: int = Field(default=80, description="ONVIF 端口")
    manufacturer: Optional[str] = Field(None, description="制造商（ONVIF 获取）")
    model: Optional[str] = Field(None, description="型号（ONVIF 获取）")


class InstanceConfig(BaseModel):
    """实例配置

    包含硬件配置和所有摄像头配置
    """
    name: str = Field(..., description="实例名称", pattern=r'^[a-z][a-z0-9-]{2,31}$')

    # 硬件配置
    hw_mode: str = Field(default="cpu", description="硬件加速模式（cpu/nvidia/hailo）")
    hw_device: Optional[str] = Field(None, description="硬件设备路径")

    # 摄像头配置
    cameras: List[CameraConfig] = Field(
        default_factory=list,
        description="摄像头列表"
    )

    # 端口分配
    port_block: List[int] = Field(
        default_factory=list,
        description="分配的 10 端口块"
    )

    # 元数据
    created_at: Optional[str] = Field(None, description="创建时间")
    updated_at: Optional[str] = Field(None, description="更新时间")


def create_single_channel_camera(
    name: str,
    ip: str,
    username: str,
    password: str,
    brand: str,
    main_stream_path: str,
    sub_stream_path: Optional[str] = None
) -> CameraConfig:
    """创建单通道摄像头配置（便捷方法）

    Args:
        name: 摄像头名称
        ip: IP 地址
        username: 用户名
        password: 密码
        brand: 品牌
        main_stream_path: 主码流路径
        sub_stream_path: 子码流路径（可选）

    Returns:
        CameraConfig: 摄像头配置对象
    """
    main_stream = StreamConfig(path=main_stream_path)
    sub_stream = StreamConfig(path=sub_stream_path) if sub_stream_path else None

    channel = ChannelConfig(
        name=f"{name}-ch1",
        main_stream=main_stream,
        sub_stream=sub_stream
    )

    return CameraConfig(
        name=name,
        ip=ip,
        username=username,
        password=password,
        brand=brand,
        channels=[channel]
    )


def create_multi_channel_camera(
    name: str,
    ip: str,
    username: str,
    password: str,
    brand: str,
    stream_pairs: List[Dict[str, str]]
) -> CameraConfig:
    """创建多通道摄像头配置

    Args:
        name: 摄像头名称
        ip: IP 地址
        username: 用户名
        password: 密码
        brand: 品牌
        stream_pairs: 流配对列表，格式 [{"main": "path", "sub": "path"}, ...]

    Returns:
        CameraConfig: 摄像头配置对象
    """
    channels = []

    for idx, pair in enumerate(stream_pairs, start=1):
        main_stream = StreamConfig(path=pair['main'])
        sub_stream = StreamConfig(path=pair['sub']) if pair.get('sub') else None

        channel = ChannelConfig(
            name=f"{name}-ch{idx}",
            main_stream=main_stream,
            sub_stream=sub_stream
        )

        channels.append(channel)

    return CameraConfig(
        name=name,
        ip=ip,
        username=username,
        password=password,
        brand=brand,
        channels=channels
    )
