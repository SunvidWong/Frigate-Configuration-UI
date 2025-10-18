"""测试摄像头品牌模板"""
import pytest
from src.models.camera_brands import (
    get_brand,
    get_all_brands,
    build_rtsp_url,
    CAMERA_BRANDS,
)


class TestCameraBrands:
    """摄像头品牌配置测试"""

    def test_get_hikvision_brand(self):
        """测试获取海康威视品牌配置"""
        brand = get_brand('hikvision')

        assert brand.id == 'hikvision'
        assert brand.name_zh == '海康威视'
        assert brand.default_port == 554
        assert len(brand.stream_templates) >= 2

    def test_get_dahua_brand(self):
        """测试获取大华品牌配置"""
        brand = get_brand('dahua')

        assert brand.id == 'dahua'
        assert brand.name_zh == '大华'
        assert 'subtype' in brand.stream_templates[0].path

    def test_get_unknown_brand_returns_generic(self):
        """测试未知品牌返回通用模板"""
        brand = get_brand('unknown-brand')

        assert brand.id == 'generic'
        assert brand.name_zh == '通用 RTSP'

    def test_get_all_brands(self):
        """测试获取所有品牌列表"""
        brands = get_all_brands()

        assert len(brands) >= 4  # 至少 4 个品牌
        assert any(b['id'] == 'hikvision' for b in brands)
        assert any(b['id'] == 'dahua' for b in brands)


class TestRTSPURLBuilder:
    """RTSP URL 构建测试"""

    def test_build_hikvision_url(self):
        """测试构建海康威视 RTSP URL"""
        url = build_rtsp_url(
            ip='192.168.1.100',
            username='admin',
            password='pass123',
            brand_id='hikvision',
            stream_index=0
        )

        assert url == 'rtsp://admin:pass123@192.168.1.100:554/Streaming/Channels/101'

    def test_build_hikvision_sub_stream_url(self):
        """测试构建海康威视子码流 URL"""
        url = build_rtsp_url(
            ip='192.168.1.100',
            username='admin',
            password='pass123',
            brand_id='hikvision',
            stream_index=1  # 子码流
        )

        assert '/Channels/102' in url

    def test_build_dahua_url(self):
        """测试构建大华 RTSP URL"""
        url = build_rtsp_url(
            ip='192.168.1.100',
            username='admin',
            password='pass123',
            brand_id='dahua',
            stream_index=0
        )

        assert 'subtype=0' in url
        assert 'channel=1' in url

    def test_build_url_with_custom_port(self):
        """测试自定义端口"""
        url = build_rtsp_url(
            ip='192.168.1.100',
            username='admin',
            password='pass123',
            brand_id='hikvision',
            stream_index=0,
            port=8554
        )

        assert ':8554/' in url

    def test_build_url_with_invalid_stream_index(self):
        """测试无效的流索引（应降级到主码流）"""
        url = build_rtsp_url(
            ip='192.168.1.100',
            username='admin',
            password='pass123',
            brand_id='hikvision',
            stream_index=99  # 超出范围
        )

        # 应该降级到索引 0（主码流）
        assert '/Channels/101' in url


class TestStreamTemplates:
    """流模板测试"""

    def test_hikvision_has_main_sub_streams(self):
        """测试海康威视有主码流和子码流模板"""
        brand = CAMERA_BRANDS['hikvision']

        assert len(brand.stream_templates) >= 2
        assert any('101' in t.path for t in brand.stream_templates)
        assert any('102' in t.path for t in brand.stream_templates)

    def test_all_brands_have_templates(self):
        """测试所有品牌都有流模板"""
        for brand_id, brand in CAMERA_BRANDS.items():
            assert len(brand.stream_templates) > 0, f"{brand_id} 缺少流模板"
            assert brand.default_port > 0, f"{brand_id} 缺少默认端口"
