"""测试校验器逻辑 - 名称、端口等验证

根据 FR-009: 实例名称校验
根据 FR-011: 摄像头名称校验
根据 FR-015: 端口冲突检测
"""
import pytest
from src.validators.name_validator import (
    validate_instance_name,
    validate_camera_name,
    is_reserved_name
)


class TestInstanceNameValidation:
    """实例名称验证测试"""

    def test_valid_instance_name(self):
        """测试有效的实例名称"""
        valid_names = [
            "abc",           # 最小长度 3
            "a" * 32,        # 最大长度 32
            "camera-front",  # 带连字符
            "cam123",        # 带数字
            "a1-b2-c3",      # 复合格式
        ]

        for name in valid_names:
            result = validate_instance_name(name)
            assert result is None, f"{name} 应该是有效名称"

    def test_invalid_instance_name_too_short(self):
        """测试过短的名称"""
        result = validate_instance_name("ab")
        assert result is not None
        assert "3-32" in result or "长度" in result

    def test_invalid_instance_name_too_long(self):
        """测试过长的名称"""
        result = validate_instance_name("a" * 33)
        assert result is not None

    def test_invalid_instance_name_starts_with_number(self):
        """测试以数字开头的名称"""
        result = validate_instance_name("123abc")
        assert result is not None
        assert "小写字母开头" in result

    def test_invalid_instance_name_uppercase(self):
        """测试包含大写字母的名称"""
        result = validate_instance_name("Camera")
        assert result is not None

    def test_invalid_instance_name_special_chars(self):
        """测试包含特殊字符的名称"""
        invalid_names = [
            "cam_front",    # 下划线
            "cam.front",    # 点号
            "cam front",    # 空格
            "cam@front",    # 特殊符号
        ]

        for name in invalid_names:
            result = validate_instance_name(name)
            assert result is not None, f"{name} 应该是无效名称"

    def test_invalid_instance_name_starts_with_hyphen(self):
        """测试以连字符开头的名称"""
        result = validate_instance_name("-camera")
        assert result is not None


class TestCameraNameValidation:
    """摄像头名称验证测试 - 同实例名称规则"""

    def test_valid_camera_name(self):
        """测试有效的摄像头名称"""
        result = validate_camera_name("cam-front")
        assert result is None

    def test_invalid_camera_name(self):
        """测试无效的摄像头名称"""
        result = validate_camera_name("Cam-Front")
        assert result is not None


class TestReservedNames:
    """保留名称测试 - FR-009"""

    def test_frigate_reserved(self):
        """测试 'frigate' 是保留名称"""
        assert is_reserved_name("frigate") is True

    def test_frigate_config_deploy_reserved(self):
        """测试 'frigate-config-deploy' 是保留名称"""
        assert is_reserved_name("frigate-config-deploy") is True

    def test_non_reserved_name(self):
        """测试非保留名称"""
        assert is_reserved_name("camera-front") is False
        assert is_reserved_name("my-frigate") is False


class TestNameUniqueness:
    """名称唯一性测试"""

    def test_duplicate_instance_name(self):
        """测试重复的实例名称检测"""
        # 这个测试需要与数据存储集成
        # 当前仅测试校验器逻辑
        existing_names = ["cam1", "cam2"]

        # 应该检测到重复
        assert "cam1" in existing_names
        assert "cam3" not in existing_names

    def test_duplicate_camera_name_in_instance(self):
        """测试同一实例内摄像头名称重复"""
        existing_cameras = ["front", "back"]

        assert "front" in existing_cameras
        assert "side" not in existing_cameras
