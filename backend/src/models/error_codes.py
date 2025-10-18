"""错误码定义与错误消息模型

根据 FR-004: 所有错误 MUST 包含错误码、中文描述、修复建议
"""
from enum import Enum
from dataclasses import dataclass
from typing import Dict


class ErrorCode(str, Enum):
    """错误码枚举"""
    # Docker 相关错误
    DOCKER_SOCKET = "DOCKER_SOCKET"
    DOCKER_DAEMON = "DOCKER_DAEMON"

    # 镜像相关错误
    IMAGE_PULL = "IMAGE_PULL"
    IMAGE_CACHE_OLD = "IMAGE_CACHE_OLD"

    # 端口相关错误
    PORT_CONFLICT = "PORT_CONFLICT"
    PORT_EXHAUSTED = "PORT_EXHAUSTED"

    # 名称验证错误
    NAME_INVALID = "NAME_INVALID"
    NAME_DUP = "NAME_DUP"
    NAME_RESERVED = "NAME_RESERVED"

    # RTSP 相关错误
    RTSP_TEST_FAIL = "RTSP_TEST_FAIL"
    RTSP_AUTH_FAIL = "RTSP_AUTH_FAIL"
    RTSP_TIMEOUT = "RTSP_TIMEOUT"
    RTSP_INVALID_URL = "RTSP_INVALID_URL"

    # 硬件相关警告
    HW_UNAVAILABLE = "HW_UNAVAILABLE"

    # ONVIF 相关错误
    ONVIF_TIMEOUT = "ONVIF_TIMEOUT"
    ONVIF_AUTH_FAIL = "ONVIF_AUTH_FAIL"


@dataclass
class ErrorMessage:
    """错误消息数据类

    Attributes:
        code: 错误码
        description: 中文描述
        suggestion: 修复建议
    """
    code: ErrorCode
    description: str
    suggestion: str


# 错误消息映射表
ERROR_MESSAGES: Dict[ErrorCode, ErrorMessage] = {
    ErrorCode.DOCKER_SOCKET: ErrorMessage(
        code=ErrorCode.DOCKER_SOCKET,
        description="未挂载 /var/run/docker.sock",
        suggestion="请在 docker-compose.yml 中添加 volumes:\n  - /var/run/docker.sock:/var/run/docker.sock"
    ),

    ErrorCode.DOCKER_DAEMON: ErrorMessage(
        code=ErrorCode.DOCKER_DAEMON,
        description="Docker daemon 不可达",
        suggestion="请确认 Docker 服务正在运行：sudo systemctl start docker"
    ),

    ErrorCode.IMAGE_PULL: ErrorMessage(
        code=ErrorCode.IMAGE_PULL,
        description="镜像拉取失败且本地无缓存",
        suggestion="请检查网络连接或使用已存在的镜像标签（如 stable）"
    ),

    ErrorCode.IMAGE_CACHE_OLD: ErrorMessage(
        code=ErrorCode.IMAGE_CACHE_OLD,
        description="本地镜像缓存已超过 30 天，可能已过期",
        suggestion="建议拉取最新镜像：docker pull ghcr.io/blakeblackshear/frigate:stable"
    ),

    ErrorCode.PORT_CONFLICT: ErrorMessage(
        code=ErrorCode.PORT_CONFLICT,
        description="端口已被占用",
        suggestion="请更换端口或启用自动端口分配，或停止占用该端口的服务"
    ),

    ErrorCode.PORT_EXHAUSTED: ErrorMessage(
        code=ErrorCode.PORT_EXHAUSTED,
        description="端口分配已耗尽（尝试 100 次后仍无可用端口块）",
        suggestion="请删除未使用的实例以释放端口，或手动指定端口范围"
    ),

    ErrorCode.NAME_INVALID: ErrorMessage(
        code=ErrorCode.NAME_INVALID,
        description="名称格式无效",
        suggestion="名称必须符合格式：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符（正则：^[a-z][a-z0-9-]{2,31}$）"
    ),

    ErrorCode.NAME_DUP: ErrorMessage(
        code=ErrorCode.NAME_DUP,
        description="名称已存在",
        suggestion="请使用不同的名称，或删除同名的实例/摄像头"
    ),

    ErrorCode.NAME_RESERVED: ErrorMessage(
        code=ErrorCode.NAME_RESERVED,
        description="名称为系统保留关键字",
        suggestion="请避免使用保留名称：frigate-config-deploy、frigate"
    ),

    ErrorCode.RTSP_TEST_FAIL: ErrorMessage(
        code=ErrorCode.RTSP_TEST_FAIL,
        description="RTSP 连通性测试失败",
        suggestion="请检查摄像头 IP、用户名、密码和 RTSP 路径是否正确。测试失败不阻止部署，可继续。"
    ),

    ErrorCode.RTSP_AUTH_FAIL: ErrorMessage(
        code=ErrorCode.RTSP_AUTH_FAIL,
        description="RTSP 鉴权失败（401 Unauthorized）",
        suggestion="请检查摄像头用户名和密码是否正确"
    ),

    ErrorCode.RTSP_TIMEOUT: ErrorMessage(
        code=ErrorCode.RTSP_TIMEOUT,
        description="RTSP 连接超时",
        suggestion="请检查摄像头 IP 地址、网络连接和防火墙设置"
    ),

    ErrorCode.RTSP_INVALID_URL: ErrorMessage(
        code=ErrorCode.RTSP_INVALID_URL,
        description="RTSP URL 格式无效或路径不匹配",
        suggestion="请检查 RTSP 路径是否正确，或尝试其他品牌模板"
    ),

    ErrorCode.HW_UNAVAILABLE: ErrorMessage(
        code=ErrorCode.HW_UNAVAILABLE,
        description="选择的硬件模式不可用，已自动降级为 CPU 模式",
        suggestion="如需使用硬件加速，请安装相应的 Docker runtime（NVIDIA Container Toolkit 或 Hailo 驱动）"
    ),

    ErrorCode.ONVIF_TIMEOUT: ErrorMessage(
        code=ErrorCode.ONVIF_TIMEOUT,
        description="ONVIF 设备发现超时",
        suggestion="请确认摄像头支持 ONVIF 协议，或切换到品牌模板方式配置"
    ),

    ErrorCode.ONVIF_AUTH_FAIL: ErrorMessage(
        code=ErrorCode.ONVIF_AUTH_FAIL,
        description="ONVIF 鉴权失败",
        suggestion="请检查摄像头用户名和密码，确保账号有 ONVIF 访问权限"
    ),
}


def get_error_message(code: ErrorCode) -> ErrorMessage:
    """获取错误消息

    Args:
        code: 错误码

    Returns:
        ErrorMessage: 错误消息对象

    Raises:
        KeyError: 如果错误码未定义
    """
    if code not in ERROR_MESSAGES:
        return ErrorMessage(
            code=code,
            description=f"未知错误码: {code}",
            suggestion="请联系系统管理员"
        )
    return ERROR_MESSAGES[code]


def format_error(code: ErrorCode, **kwargs: str) -> str:
    """格式化错误消息为日志字符串

    Args:
        code: 错误码
        **kwargs: 额外的上下文信息

    Returns:
        str: 格式化的错误消息
    """
    msg = get_error_message(code)
    result = f"[ERROR][{code.value}] {msg.description}"

    if kwargs:
        context = ", ".join(f"{k}={v}" for k, v in kwargs.items())
        result += f" ({context})"

    result += f"\n修复: {msg.suggestion}"
    return result


def format_warning(code: ErrorCode, **kwargs: str) -> str:
    """格式化警告消息为日志字符串

    Args:
        code: 错误码
        **kwargs: 额外的上下文信息

    Returns:
        str: 格式化的警告消息
    """
    msg = get_error_message(code)
    result = f"[WARN][{code.value}] {msg.description}"

    if kwargs:
        context = ", ".join(f"{k}={v}" for k, v in kwargs.items())
        result += f" ({context})"

    return result
