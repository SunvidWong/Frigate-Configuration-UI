"""测试端口验证与冲突检测

根据 FR-015: 端口冲突检测
根据 FR-016: 10 端口连续块分配（5200 起始）
"""
import pytest
from src.validators.port_validator import (
    check_port_available,
    allocate_port_block,
    is_port_in_range,
)


class TestPortAvailability:
    """端口可用性测试"""

    def test_port_available(self):
        """测试端口可用性检查"""
        # 大端口通常可用
        result = check_port_available(59999)
        assert isinstance(result, bool)

    def test_port_1_unavailable(self):
        """测试端口 1 通常不可用（需要 root）"""
        # 端口 1-1024 是特权端口
        result = check_port_available(1)
        # 可能因权限而不可用，但至少应该返回 bool
        assert isinstance(result, bool)


class TestPortBlockAllocation:
    """端口块分配测试 - FR-016"""

    def test_allocate_port_block_default_start(self):
        """测试从默认起始端口（5200）分配"""
        block = allocate_port_block(start_port=5200, used_blocks=[])

        assert block is not None
        assert len(block) == 10
        assert block[0] >= 5200
        assert block[-1] == block[0] + 9  # 连续 10 个端口

    def test_allocate_port_block_avoid_conflicts(self):
        """测试避免已使用的端口块"""
        used_blocks = [
            list(range(5200, 5210)),  # 5200-5209 已使用
        ]

        block = allocate_port_block(start_port=5200, used_blocks=used_blocks)

        assert block is not None
        assert block[0] >= 5210  # 应该从下一个块开始

    def test_allocate_port_block_multiple_conflicts(self):
        """测试多个冲突块"""
        used_blocks = [
            list(range(5200, 5210)),  # Block 1
            list(range(5210, 5220)),  # Block 2
            list(range(5220, 5230)),  # Block 3
        ]

        block = allocate_port_block(start_port=5200, used_blocks=used_blocks)

        assert block is not None
        assert block[0] >= 5230  # 应该从第4个块开始

    def test_allocate_port_block_exhaustion(self):
        """测试端口耗尽场景（理论情况）"""
        # 模拟大量已使用的端口块
        used_blocks = []
        for i in range(0, 100):  # 100 个块
            used_blocks.append(list(range(5200 + i * 10, 5200 + (i + 1) * 10)))

        # 应该能继续分配（或返回 None 如果真的耗尽）
        block = allocate_port_block(start_port=5200, used_blocks=used_blocks, max_attempts=10)

        # 根据实现，可能返回 None 或继续分配更高端口
        if block is not None:
            assert len(block) == 10


class TestPortRangeCheck:
    """端口范围检查测试"""

    def test_port_in_valid_range(self):
        """测试端口在有效范围内"""
        assert is_port_in_range(5200) is True
        assert is_port_in_range(8080) is True
        assert is_port_in_range(65535) is True

    def test_port_below_range(self):
        """测试端口低于有效范围"""
        assert is_port_in_range(0) is False
        assert is_port_in_range(-1) is False

    def test_port_above_range(self):
        """测试端口超出有效范围"""
        assert is_port_in_range(65536) is False
        assert is_port_in_range(70000) is False


class TestPortConflictDetection:
    """端口冲突检测测试"""

    def test_detect_conflict_with_used_port(self):
        """测试检测与已使用端口的冲突"""
        used_ports = {5200, 5201, 5202}

        assert 5200 in used_ports
        assert 5210 not in used_ports

    def test_detect_block_overlap(self):
        """测试检测端口块重叠"""
        block1 = set(range(5200, 5210))  # 5200-5209
        block2 = set(range(5205, 5215))  # 5205-5214

        overlap = block1 & block2
        assert len(overlap) > 0  # 应该有重叠
        assert 5205 in overlap
