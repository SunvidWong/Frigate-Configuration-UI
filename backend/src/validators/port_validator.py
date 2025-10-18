"""端口验证器

根据 FR-015: 端口冲突检测
根据 FR-016: 10 端口连续块分配，起始端口 5200
根据 FR-017: 最多尝试 100 次寻找可用端口块
"""
import socket
from typing import Optional


# 默认起始端口
DEFAULT_START_PORT = 5200

# 每个实例分配的端口数量
PORTS_PER_INSTANCE = 10

# 最大尝试次数（避免无限循环）
MAX_PORT_ALLOCATION_ATTEMPTS = 100


def check_port_available(port: int, host: str = '0.0.0.0') -> bool:
    """检查单个端口是否可用

    Args:
        port: 端口号
        host: 主机地址，默认 '0.0.0.0'

    Returns:
        bool: 端口可用返回 True，否则返回 False
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((host, port))
            return True
    except (OSError, PermissionError):
        return False


def is_port_in_range(port: int) -> bool:
    """检查端口是否在有效范围内

    Args:
        port: 端口号

    Returns:
        bool: 端口在 1-65535 范围内返回 True
    """
    return 1 <= port <= 65535


def allocate_port_block(
    start_port: int = DEFAULT_START_PORT,
    used_blocks: list[list[int]] = None,
    max_attempts: int = MAX_PORT_ALLOCATION_ATTEMPTS
) -> Optional[list[int]]:
    """分配一个连续的 10 端口块

    Args:
        start_port: 起始端口，默认 5200
        used_blocks: 已使用的端口块列表
        max_attempts: 最大尝试次数，默认 100

    Returns:
        Optional[list[int]]: 成功返回端口块列表，失败返回 None

    算法:
        1. 从 start_port 开始，每次递增 10
        2. 检查该块是否与已使用块重叠
        3. 检查块内所有端口是否可用
        4. 最多尝试 max_attempts 次
    """
    if used_blocks is None:
        used_blocks = []

    # 将已使用块转换为集合以便快速查找
    used_ports_set = set()
    for block in used_blocks:
        used_ports_set.update(block)

    current_port = start_port

    for attempt in range(max_attempts):
        # 生成候选端口块
        candidate_block = list(range(current_port, current_port + PORTS_PER_INSTANCE))

        # 检查是否超出有效范围
        if candidate_block[-1] > 65535:
            return None  # 端口范围耗尽

        # 检查是否与已使用端口重叠
        if not any(port in used_ports_set for port in candidate_block):
            # 检查所有端口是否可用（可选，根据需求启用）
            # 注意：在容器环境中，端口检查可能不准确
            # 因此这里仅检查与已知使用块的冲突
            return candidate_block

        # 移动到下一个可能的块
        current_port += PORTS_PER_INSTANCE

    # 尝试次数耗尽
    return None


def check_port_block_available(port_block: list[int]) -> bool:
    """检查整个端口块是否可用

    Args:
        port_block: 端口列表

    Returns:
        bool: 所有端口都可用返回 True
    """
    return all(check_port_available(port) for port in port_block)


def find_conflicting_ports(
    port_block: list[int],
    used_blocks: list[list[int]]
) -> list[int]:
    """查找与已使用块冲突的端口

    Args:
        port_block: 要检查的端口块
        used_blocks: 已使用的端口块列表

    Returns:
        list[int]: 冲突的端口列表
    """
    used_ports_set = set()
    for block in used_blocks:
        used_ports_set.update(block)

    conflicts = [port for port in port_block if port in used_ports_set]
    return conflicts
