"""流配对算法

根据 FR-021: 自动配对主码流和子码流
支持多种摄像头品牌的流命名模式
"""
import re
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def pair_main_and_sub_streams(
    stream_uris: List[str],
    brand: str = 'generic'
) -> List[Dict[str, Optional[str]]]:
    """配对主码流和子码流

    Args:
        stream_uris: RTSP 流地址列表
        brand: 摄像头品牌（hikvision, dahua, uniview, generic）

    Returns:
        List[Dict]: 配对结果列表，每个元素包含 'main' 和 'sub' 键

    算法:
        1. 根据品牌选择配对策略
        2. 海康威视: 101/102, 201/202 模式
        3. 大华: subtype=0/1 模式
        4. 通用: 启发式配对（main/sub, high/low 等关键词）
    """
    if not stream_uris:
        return []

    brand = brand.lower()

    if brand == 'hikvision':
        return _pair_hikvision_streams(stream_uris)
    elif brand == 'dahua':
        return _pair_dahua_streams(stream_uris)
    elif brand == 'uniview':
        return _pair_uniview_streams(stream_uris)
    else:
        return _pair_generic_streams(stream_uris)


def is_main_stream(uri: str, brand: str = 'generic') -> bool:
    """判断是否为主码流

    Args:
        uri: RTSP 流地址
        brand: 摄像头品牌

    Returns:
        bool: 是主码流返回 True
    """
    brand = brand.lower()

    if brand == 'hikvision':
        # 海康威视: x01 是主码流（101, 201, 301...）
        match = re.search(r'/Channels/(\d+)01', uri)
        return match is not None

    elif brand == 'dahua':
        # 大华: subtype=0 是主码流
        return 'subtype=0' in uri

    elif brand == 'uniview':
        # 宇视: trackID=1 是主码流
        return 'trackID=1' in uri or 'trackID=0' in uri

    else:
        # 通用启发式: 包含 main, high, primary, stream1 等关键词
        uri_lower = uri.lower()
        main_keywords = ['main', 'high', 'primary', 'stream1', 'profile1']
        return any(kw in uri_lower for kw in main_keywords)


def is_sub_stream(uri: str, brand: str = 'generic') -> bool:
    """判断是否为子码流

    Args:
        uri: RTSP 流地址
        brand: 摄像头品牌

    Returns:
        bool: 是子码流返回 True
    """
    brand = brand.lower()

    if brand == 'hikvision':
        # 海康威视: x02 是子码流（102, 202, 302...）
        match = re.search(r'/Channels/(\d+)02', uri)
        return match is not None

    elif brand == 'dahua':
        # 大华: subtype=1 是子码流
        return 'subtype=1' in uri

    elif brand == 'uniview':
        # 宇视: trackID=2 是子码流
        return 'trackID=2' in uri

    else:
        # 通用启发式: 包含 sub, low, secondary, stream2 等关键词
        uri_lower = uri.lower()
        sub_keywords = ['sub', 'low', 'secondary', 'stream2', 'profile2']
        return any(kw in uri_lower for kw in sub_keywords)


def _pair_hikvision_streams(stream_uris: List[str]) -> List[Dict[str, Optional[str]]]:
    """海康威视流配对

    模式: Channels/101 (主) + Channels/102 (子)
          Channels/201 (主) + Channels/202 (子)
    """
    pairs = []
    main_streams = {}
    sub_streams = {}

    # 分类主码流和子码流
    for uri in stream_uris:
        match_main = re.search(r'/Channels/(\d)01', uri)
        match_sub = re.search(r'/Channels/(\d)02', uri)

        if match_main:
            channel = match_main.group(1)
            main_streams[channel] = uri
        elif match_sub:
            channel = match_sub.group(1)
            sub_streams[channel] = uri

    # 配对
    for channel, main_uri in main_streams.items():
        pairs.append({
            'main': main_uri,
            'sub': sub_streams.get(channel),
            'channel': channel,
        })

    # 添加未配对的子码流
    for channel, sub_uri in sub_streams.items():
        if channel not in main_streams:
            pairs.append({
                'main': None,
                'sub': sub_uri,
                'channel': channel,
            })

    return pairs


def _pair_dahua_streams(stream_uris: List[str]) -> List[Dict[str, Optional[str]]]:
    """大华流配对

    模式: channel=1&subtype=0 (主) + channel=1&subtype=1 (子)
    """
    pairs = []
    main_streams = {}
    sub_streams = {}

    for uri in stream_uris:
        # 提取 channel 参数
        channel_match = re.search(r'channel=(\d+)', uri)
        if not channel_match:
            continue

        channel = channel_match.group(1)

        if 'subtype=0' in uri:
            main_streams[channel] = uri
        elif 'subtype=1' in uri:
            sub_streams[channel] = uri

    # 配对
    for channel, main_uri in main_streams.items():
        pairs.append({
            'main': main_uri,
            'sub': sub_streams.get(channel),
            'channel': channel,
        })

    return pairs


def _pair_uniview_streams(stream_uris: List[str]) -> List[Dict[str, Optional[str]]]:
    """宇视流配对

    模式: trackID=1 (主) + trackID=2 (子)
    """
    main = None
    sub = None

    for uri in stream_uris:
        if 'trackID=1' in uri or 'trackID=0' in uri:
            main = uri
        elif 'trackID=2' in uri:
            sub = uri

    if main or sub:
        return [{'main': main, 'sub': sub}]

    return []


def _pair_generic_streams(stream_uris: List[str]) -> List[Dict[str, Optional[str]]]:
    """通用流配对（启发式）

    策略:
        1. 优先查找明确的 main/sub 关键词
        2. 如果只有一个流，作为主码流使用
        3. 如果有多个流，第一个作为主码流，第二个作为子码流
    """
    if not stream_uris:
        return []

    main = None
    sub = None

    # 尝试根据关键词识别
    for uri in stream_uris:
        if is_main_stream(uri, 'generic') and not main:
            main = uri
        elif is_sub_stream(uri, 'generic') and not sub:
            sub = uri

    # 如果没有识别出来，使用位置启发式
    if not main:
        main = stream_uris[0]

    if not sub and len(stream_uris) > 1:
        # 如果第二个流不是主码流，视为子码流
        if stream_uris[1] != main:
            sub = stream_uris[1]

    return [{'main': main, 'sub': sub}]
