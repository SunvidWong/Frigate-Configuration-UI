"""名称验证器

根据 FR-009: 实例名称 MUST 符合 ^[a-z][a-z0-9-]{2,31}$
根据 FR-011: 摄像头名称遵循相同规则
根据 FR-004: 验证失败返回错误码 + 中文描述 + 修复建议
"""
import re
from typing import Optional


# 名称验证正则：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32
NAME_PATTERN = re.compile(r'^[a-z][a-z0-9-]{2,31}$')

# 系统保留名称
RESERVED_NAMES = {
    "frigate",
    "frigate-config-deploy",
}


def validate_instance_name(name: str) -> Optional[str]:
    """验证实例名称

    Args:
        name: 实例名称

    Returns:
        Optional[str]: 如果验证失败，返回错误描述；否则返回 None

    根据 FR-009 规则验证:
        - 小写字母开头
        - 仅包含小写字母、数字和连字符
        - 长度 3-32 字符
        - 不能是系统保留名称
    """
    if not name:
        return "实例名称不能为空"

    if len(name) < 3:
        return "名称长度必须至少 3 字符"

    if len(name) > 32:
        return "名称长度不能超过 32 字符"

    if not NAME_PATTERN.match(name):
        # 详细的错误提示
        if not name[0].islower() or not name[0].isalpha():
            return "名称必须以小写字母开头"

        if not all(c.islower() or c.isdigit() or c == '-' for c in name):
            return "名称只能包含小写字母、数字和连字符"

        return "名称格式无效：必须符合格式：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符（正则：^[a-z][a-z0-9-]{2,31}$）"

    if is_reserved_name(name):
        return f"名称 '{name}' 为系统保留关键字，请使用其他名称"

    return None


def validate_camera_name(name: str) -> Optional[str]:
    """验证摄像头名称

    Args:
        name: 摄像头名称

    Returns:
        Optional[str]: 如果验证失败，返回错误描述；否则返回 None

    根据 FR-011: 摄像头名称遵循与实例名称相同的规则
    """
    # 使用相同的验证逻辑
    return validate_instance_name(name)


def is_reserved_name(name: str) -> bool:
    """检查是否为系统保留名称

    Args:
        name: 要检查的名称

    Returns:
        bool: 如果是保留名称返回 True，否则返回 False
    """
    return name.lower() in RESERVED_NAMES


def validate_name_unique(name: str, existing_names: list[str]) -> Optional[str]:
    """验证名称唯一性

    Args:
        name: 要验证的名称
        existing_names: 已存在的名称列表

    Returns:
        Optional[str]: 如果名称重复，返回错误描述；否则返回 None
    """
    if name in existing_names:
        return f"名称 '{name}' 已存在，请使用不同的名称"

    return None
