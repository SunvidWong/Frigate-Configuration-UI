"""预检服务 - Docker 环境检查

根据 FR-001: MUST 挂载 /var/run/docker.sock
根据 FR-004: 所有错误 MUST 包含错误码、中文描述、修复建议
"""
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional
import docker
import docker.errors
from src.models.error_codes import ErrorCode, format_error, format_warning


DOCKER_SOCKET_PATH = Path("/var/run/docker.sock")


def check_docker_socket() -> bool:
    """检查 Docker socket 是否挂载且可访问

    Returns:
        bool: True 如果 socket 存在且可读，否则 False

    Side Effects:
        失败时会打印格式化的错误消息到 stderr
    """
    # 检查文件是否存在
    if not DOCKER_SOCKET_PATH.exists():
        error_msg = format_error(
            ErrorCode.DOCKER_SOCKET,
            path=str(DOCKER_SOCKET_PATH)
        )
        print(error_msg, flush=True)
        return False

    # 检查是否可读写
    if not os.access(DOCKER_SOCKET_PATH, os.R_OK | os.W_OK):
        error_msg = format_error(
            ErrorCode.DOCKER_SOCKET,
            path=str(DOCKER_SOCKET_PATH),
            reason="权限不足"
        )
        print(error_msg, flush=True)
        return False

    return True


def check_docker_daemon() -> bool:
    """检查 Docker daemon 是否可达

    Returns:
        bool: True 如果能成功连接并 ping daemon，否则 False

    Side Effects:
        失败时会打印格式化的错误消息到 stdout
    """
    try:
        client = docker.from_env()
        client.ping()
        return True
    except docker.errors.DockerException as e:
        error_msg = format_error(
            ErrorCode.DOCKER_DAEMON,
            error=str(e)
        )
        print(error_msg, flush=True)
        return False
    except Exception as e:
        error_msg = format_error(
            ErrorCode.DOCKER_DAEMON,
            error=f"未知错误: {str(e)}"
        )
        print(error_msg, flush=True)
        return False


def check_image_local(image_tag: str) -> Dict[str, any]:
    """检查指定镜像是否在本地存在

    Args:
        image_tag: 镜像标签，如 "ghcr.io/blakeblackshear/frigate:stable"

    Returns:
        Dict 包含以下键:
            - exists (bool): 镜像是否存在
            - age_days (int|None): 镜像年龄（天数）
            - warning (ErrorCode|None): 如果镜像超过 30 天，返回 IMAGE_CACHE_OLD
            - error (str|None): 如果检查失败，返回错误信息

    Side Effects:
        如果镜像过期，会打印警告消息
    """
    result = {
        "exists": False,
        "age_days": None,
        "warning": None,
        "error": None
    }

    try:
        client = docker.from_env()
        image = client.images.get(image_tag)

        # 计算镜像年龄
        created_str = image.attrs.get("Created", "")
        if created_str:
            # Docker 返回 ISO 8601 格式时间戳
            created_time = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            age = datetime.now(created_time.tzinfo) - created_time
            age_days = age.days

            result["exists"] = True
            result["age_days"] = age_days

            # 检查是否超过 30 天
            if age_days > 30:
                result["warning"] = ErrorCode.IMAGE_CACHE_OLD
                warning_msg = format_warning(
                    ErrorCode.IMAGE_CACHE_OLD,
                    image=image_tag,
                    age_days=str(age_days)
                )
                print(warning_msg, flush=True)
        else:
            result["exists"] = True

        return result

    except docker.errors.ImageNotFound:
        # 镜像不存在是预期情况，不是错误
        return result

    except docker.errors.APIError as e:
        result["error"] = str(e)
        return result

    except Exception as e:
        result["error"] = f"未知错误: {str(e)}"
        return result
