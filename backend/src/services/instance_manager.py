"""实例管理服务

提供实例克隆、配置导出等高级功能
"""
import json
import shutil
from pathlib import Path
from typing import Dict, Optional
from src.models.camera_config import InstanceConfig
from src.validators.port_validator import allocate_port_block


class InstanceManager:
    """实例管理器"""

    def __init__(self, data_root: str = "./data/instances"):
        """初始化实例管理器

        Args:
            data_root: 数据根目录
        """
        self.data_root = Path(data_root)
        self.port_allocations_file = Path("./data/port_allocations.json")

    def clone_instance(
        self,
        source_name: str,
        new_name: Optional[str] = None
    ) -> InstanceConfig:
        """克隆实例

        Args:
            source_name: 源实例名称
            new_name: 新实例名称，如果为 None 则自动生成

        Returns:
            InstanceConfig: 新实例配置

        根据 FR-034: 克隆实例功能
        根据 FR-034a: 自动追加 -copy-N 后缀
        """
        source_dir = self.data_root / source_name

        if not source_dir.exists():
            raise FileNotFoundError(f"源实例不存在: {source_name}")

        # 自动生成新名称
        if new_name is None:
            new_name = self._generate_copy_name(source_name)

        # 读取源实例配置
        source_config_file = source_dir / 'config' / 'config.yml'
        if not source_config_file.exists():
            raise FileNotFoundError(f"源实例配置文件不存在: {source_config_file}")

        # TODO: 解析配置文件并创建新的 InstanceConfig
        # 这里简化处理，返回一个基础配置
        # 实际应该从 YAML 反序列化

        # 分配新端口块
        used_blocks = self._load_port_allocations()
        new_port_block = allocate_port_block(
            start_port=5200,
            used_blocks=list(used_blocks.values())
        )

        if not new_port_block:
            raise RuntimeError("无法分配端口块给克隆实例")

        # 创建新实例配置
        # TODO: 实际应该从源配置复制摄像头等配置
        new_instance = InstanceConfig(
            name=new_name,
            cameras=[],  # 应从源配置复制
            port_block=new_port_block
        )

        return new_instance

    def export_config(self, instance_name: str) -> bytes:
        """导出实例配置

        Args:
            instance_name: 实例名称

        Returns:
            bytes: 配置文件内容（YAML 格式）

        根据 FR-035: 配置导出功能
        """
        config_file = self.data_root / instance_name / 'config' / 'config.yml'

        if not config_file.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_file}")

        return config_file.read_bytes()

    def _generate_copy_name(self, source_name: str) -> str:
        """生成克隆实例名称

        Args:
            source_name: 源实例名称

        Returns:
            str: 新实例名称（自动追加 -copy-N）

        规则: instance -> instance-copy-1 -> instance-copy-2 ...
        """
        n = 1
        while True:
            new_name = f"{source_name}-copy-{n}"
            new_dir = self.data_root / new_name

            if not new_dir.exists():
                return new_name

            n += 1

            if n > 100:  # 防止无限循环
                raise RuntimeError("克隆实例数量超过限制")

    def _load_port_allocations(self) -> Dict[str, list[int]]:
        """加载端口分配记录

        Returns:
            Dict[str, list[int]]: 实例名称 -> 端口块映射
        """
        if not self.port_allocations_file.exists():
            return {}

        try:
            data = json.loads(self.port_allocations_file.read_text())
            return data.get('allocations', {})
        except Exception:
            return {}

    def _save_port_allocations(self, allocations: Dict[str, list[int]]):
        """保存端口分配记录

        Args:
            allocations: 端口分配映射
        """
        self.port_allocations_file.parent.mkdir(parents=True, exist_ok=True)

        data = {'allocations': allocations}
        self.port_allocations_file.write_text(
            json.dumps(data, indent=2, ensure_ascii=False)
        )

    def register_port_allocation(self, instance_name: str, port_block: list[int]):
        """注册端口分配

        Args:
            instance_name: 实例名称
            port_block: 分配的端口块
        """
        allocations = self._load_port_allocations()
        allocations[instance_name] = port_block
        self._save_port_allocations(allocations)

    def release_port_allocation(self, instance_name: str):
        """释放端口分配

        Args:
            instance_name: 实例名称
        """
        allocations = self._load_port_allocations()

        if instance_name in allocations:
            del allocations[instance_name]
            self._save_port_allocations(allocations)
