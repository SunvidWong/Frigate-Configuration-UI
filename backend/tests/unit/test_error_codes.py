"""测试错误码枚举与错误消息"""
import pytest
from src.models.error_codes import ErrorCode, ErrorMessage, get_error_message


def test_error_code_enum_exists():
    """测试 ErrorCode 枚举存在所有必需的错误码"""
    assert hasattr(ErrorCode, 'DOCKER_SOCKET')
    assert hasattr(ErrorCode, 'DOCKER_DAEMON')
    assert hasattr(ErrorCode, 'IMAGE_PULL')
    assert hasattr(ErrorCode, 'PORT_CONFLICT')
    assert hasattr(ErrorCode, 'NAME_INVALID')
    assert hasattr(ErrorCode, 'NAME_DUP')
    assert hasattr(ErrorCode, 'NAME_RESERVED')
    assert hasattr(ErrorCode, 'RTSP_TEST_FAIL')


def test_error_message_has_chinese_description():
    """测试所有错误码都有中文描述"""
    error_codes = [
        ErrorCode.DOCKER_SOCKET,
        ErrorCode.DOCKER_DAEMON,
        ErrorCode.IMAGE_PULL,
        ErrorCode.PORT_CONFLICT,
        ErrorCode.NAME_INVALID,
    ]

    for code in error_codes:
        msg = get_error_message(code)
        assert msg.description, f"{code} 缺少中文描述"
        assert len(msg.description) > 0, f"{code} 描述为空"
        # 确保描述包含中文字符
        assert any('\u4e00' <= char <= '\u9fff' for char in msg.description), \
            f"{code} 描述不包含中文字符"


def test_error_message_has_suggestion():
    """测试所有错误码都有修复建议 - FR-004"""
    error_codes = [
        ErrorCode.DOCKER_SOCKET,
        ErrorCode.DOCKER_DAEMON,
        ErrorCode.IMAGE_PULL,
        ErrorCode.PORT_CONFLICT,
        ErrorCode.NAME_INVALID,
    ]

    for code in error_codes:
        msg = get_error_message(code)
        assert msg.suggestion, f"{code} 缺少修复建议"
        assert len(msg.suggestion) > 0, f"{code} 修复建议为空"


def test_error_message_format():
    """测试 ErrorMessage 数据类结构"""
    msg = get_error_message(ErrorCode.DOCKER_SOCKET)

    assert isinstance(msg, ErrorMessage)
    assert hasattr(msg, 'code')
    assert hasattr(msg, 'description')
    assert hasattr(msg, 'suggestion')
    assert msg.code == ErrorCode.DOCKER_SOCKET


def test_error_code_uniqueness():
    """测试错误码值唯一性"""
    codes = [code.value for code in ErrorCode]
    assert len(codes) == len(set(codes)), "存在重复的错误码值"
