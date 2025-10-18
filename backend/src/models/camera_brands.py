"""摄像头品牌模板

根据 FR-012: 品牌模板支持
根据 FR-020: ONVIF 失败时使用品牌模板降级
"""
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class StreamTemplate:
    """流地址模板"""
    name: str
    path: str
    description: str


@dataclass
class CameraBrand:
    """摄像头品牌配置"""
    id: str
    name: str
    name_zh: str
    default_port: int
    default_username: str
    stream_templates: List[StreamTemplate]


# 品牌模板定义
CAMERA_BRANDS: Dict[str, CameraBrand] = {
    'hikvision': CameraBrand(
        id='hikvision',
        name='Hikvision',
        name_zh='海康威视',
        default_port=554,
        default_username='admin',
        stream_templates=[
            StreamTemplate(
                name='主码流',
                path='/Streaming/Channels/101',
                description='高分辨率主码流（通道 1）'
            ),
            StreamTemplate(
                name='子码流',
                path='/Streaming/Channels/102',
                description='低分辨率子码流（通道 1）'
            ),
            StreamTemplate(
                name='第三码流',
                path='/Streaming/Channels/103',
                description='可选的第三码流'
            ),
        ]
    ),

    'dahua': CameraBrand(
        id='dahua',
        name='Dahua',
        name_zh='大华',
        default_port=554,
        default_username='admin',
        stream_templates=[
            StreamTemplate(
                name='主码流',
                path='/cam/realmonitor?channel=1&subtype=0',
                description='高分辨率主码流'
            ),
            StreamTemplate(
                name='子码流',
                path='/cam/realmonitor?channel=1&subtype=1',
                description='低分辨率子码流'
            ),
        ]
    ),

    'uniview': CameraBrand(
        id='uniview',
        name='Uniview',
        name_zh='宇视',
        default_port=554,
        default_username='admin',
        stream_templates=[
            StreamTemplate(
                name='主码流',
                path='/media/video1',
                description='高分辨率主码流'
            ),
            StreamTemplate(
                name='子码流',
                path='/media/video2',
                description='低分辨率子码流'
            ),
        ]
    ),

    'generic': CameraBrand(
        id='generic',
        name='Generic',
        name_zh='通用 RTSP',
        default_port=554,
        default_username='admin',
        stream_templates=[
            StreamTemplate(
                name='默认流',
                path='/stream',
                description='通用 RTSP 流路径（请根据实际情况修改）'
            ),
            StreamTemplate(
                name='备选路径 1',
                path='/live',
                description='常见备选路径'
            ),
            StreamTemplate(
                name='备选路径 2',
                path='/h264',
                description='常见备选路径'
            ),
        ]
    ),
}


def get_brand(brand_id: str) -> CameraBrand:
    """获取品牌配置

    Args:
        brand_id: 品牌 ID

    Returns:
        CameraBrand: 品牌配置对象，未找到返回通用模板
    """
    return CAMERA_BRANDS.get(brand_id.lower(), CAMERA_BRANDS['generic'])


def get_all_brands() -> List[Dict]:
    """获取所有支持的品牌列表

    Returns:
        List[Dict]: 品牌列表（简化格式）
    """
    return [
        {
            'id': brand.id,
            'name': brand.name,
            'name_zh': brand.name_zh,
        }
        for brand in CAMERA_BRANDS.values()
    ]


def build_rtsp_url(
    ip: str,
    username: str,
    password: str,
    brand_id: str,
    stream_index: int = 0,
    port: int = None
) -> str:
    """构建 RTSP URL

    Args:
        ip: 摄像头 IP 地址
        username: 用户名
        password: 密码
        brand_id: 品牌 ID
        stream_index: 流索引（0=主码流, 1=子码流）
        port: RTSP 端口，默认使用品牌默认端口

    Returns:
        str: 完整的 RTSP URL
    """
    brand = get_brand(brand_id)

    if port is None:
        port = brand.default_port

    if stream_index >= len(brand.stream_templates):
        stream_index = 0

    path = brand.stream_templates[stream_index].path

    return f"rtsp://{username}:{password}@{ip}:{port}{path}"
