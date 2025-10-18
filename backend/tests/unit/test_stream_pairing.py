"""测试流配对算法

根据 FR-021: 自动配对主码流和子码流
"""
import pytest
from src.services.stream_pairing import (
    pair_main_and_sub_streams,
    is_main_stream,
    is_sub_stream,
)


class TestStreamPairing:
    """流配对算法测试"""

    def test_pair_streams_hikvision_pattern(self):
        """测试海康威视流配对（101 主码流, 102 子码流）"""
        stream_uris = [
            'rtsp://192.168.1.100:554/Streaming/Channels/101',
            'rtsp://192.168.1.100:554/Streaming/Channels/102',
            'rtsp://192.168.1.100:554/Streaming/Channels/201',
            'rtsp://192.168.1.100:554/Streaming/Channels/202',
        ]

        pairs = pair_main_and_sub_streams(stream_uris, brand='hikvision')

        assert len(pairs) == 2
        assert pairs[0]['main'] == stream_uris[0]
        assert pairs[0]['sub'] == stream_uris[1]
        assert pairs[1]['main'] == stream_uris[2]
        assert pairs[1]['sub'] == stream_uris[3]

    def test_pair_streams_dahua_pattern(self):
        """测试大华流配对（channel=1&subtype=0 主码流, subtype=1 子码流）"""
        stream_uris = [
            'rtsp://192.168.1.100:554/cam/realmonitor?channel=1&subtype=0',
            'rtsp://192.168.1.100:554/cam/realmonitor?channel=1&subtype=1',
        ]

        pairs = pair_main_and_sub_streams(stream_uris, brand='dahua')

        assert len(pairs) == 1
        assert 'subtype=0' in pairs[0]['main']
        assert 'subtype=1' in pairs[0]['sub']

    def test_pair_streams_generic_heuristic(self):
        """测试通用流配对（使用启发式规则）"""
        stream_uris = [
            'rtsp://192.168.1.100:554/stream1',  # 主码流（假设）
            'rtsp://192.168.1.100:554/stream2',  # 子码流（假设）
        ]

        pairs = pair_main_and_sub_streams(stream_uris, brand='generic')

        # 通用模式下，至少应该返回主码流
        assert len(pairs) > 0
        assert pairs[0]['main'] is not None

    def test_pair_streams_single_stream(self):
        """测试只有一个流的情况"""
        stream_uris = [
            'rtsp://192.168.1.100:554/stream',
        ]

        pairs = pair_main_and_sub_streams(stream_uris, brand='generic')

        assert len(pairs) == 1
        assert pairs[0]['main'] == stream_uris[0]
        assert pairs[0]['sub'] is None  # 没有子码流

    def test_pair_streams_empty_list(self):
        """测试空流列表"""
        pairs = pair_main_and_sub_streams([], brand='generic')

        assert pairs == []


class TestStreamTypeDetection:
    """流类型检测测试"""

    def test_is_main_stream_hikvision(self):
        """测试海康威视主码流检测（101, 201, 301...）"""
        assert is_main_stream('rtsp://ip/Channels/101', 'hikvision') is True
        assert is_main_stream('rtsp://ip/Channels/201', 'hikvision') is True
        assert is_main_stream('rtsp://ip/Channels/102', 'hikvision') is False

    def test_is_sub_stream_hikvision(self):
        """测试海康威视子码流检测（102, 202, 302...）"""
        assert is_sub_stream('rtsp://ip/Channels/102', 'hikvision') is True
        assert is_sub_stream('rtsp://ip/Channels/202', 'hikvision') is True
        assert is_sub_stream('rtsp://ip/Channels/101', 'hikvision') is False

    def test_is_main_stream_dahua(self):
        """测试大华主码流检测（subtype=0）"""
        assert is_main_stream('rtsp://ip?channel=1&subtype=0', 'dahua') is True
        assert is_main_stream('rtsp://ip?channel=1&subtype=1', 'dahua') is False

    def test_is_sub_stream_dahua(self):
        """测试大华子码流检测（subtype=1）"""
        assert is_sub_stream('rtsp://ip?channel=1&subtype=1', 'dahua') is True
        assert is_sub_stream('rtsp://ip?channel=1&subtype=0', 'dahua') is False

    def test_stream_type_generic(self):
        """测试通用流类型检测（启发式）"""
        # 通用模式下，包含 'main', 'high', 'primary' 的视为主码流
        assert is_main_stream('rtsp://ip/mainstream', 'generic') is True
        assert is_main_stream('rtsp://ip/high_quality', 'generic') is True

        # 包含 'sub', 'low', 'secondary' 的视为子码流
        assert is_sub_stream('rtsp://ip/substream', 'generic') is True
        assert is_sub_stream('rtsp://ip/low_quality', 'generic') is True
