"""Docker 部署服务

根据 FR-029: 使用 Docker SDK 部署容器
根据 FR-030: 写入配置文件到数据目录
根据 FR-031: 启动容器并返回容器 ID
"""
import os
import docker
import logging
from pathlib import Path
from typing import Dict, Optional
from src.models.camera_config import InstanceConfig
from src.services.config_renderer import render_frigate_config, render_docker_compose
from src.models.error_codes import ErrorCode, format_error

logger = logging.getLogger(__name__)


class DeploymentService:
    """部署服务类"""

    def __init__(self, data_root: str = "./data/instances"):
        """初始化部署服务

        Args:
            data_root: 数据根目录
        """
        self.data_root = Path(data_root)
        self.docker_client = None

    def _get_docker_client(self) -> docker.DockerClient:
        """获取 Docker 客户端

        Returns:
            docker.DockerClient: Docker 客户端实例

        Raises:
            RuntimeError: Docker 不可用时抛出
        """
        if self.docker_client is None:
            try:
                self.docker_client = docker.from_env()
                self.docker_client.ping()
            except Exception as e:
                error_msg = format_error(ErrorCode.DOCKER_DAEMON, error=str(e))
                print(error_msg, flush=True)
                raise RuntimeError("Docker 不可用")

        return self.docker_client

    def deploy_instance(self, instance: InstanceConfig) -> Dict:
        """部署 Frigate 实例

        Args:
            instance: 实例配置

        Returns:
            Dict: 部署结果，包含 container_id, status 等

        步骤:
            1. 创建实例数据目录
            2. 生成 Frigate 配置文件
            3. 生成 docker-compose.yml
            4. 拉取镜像（如果本地不存在）
            5. 启动容器

        根据 FR-029, FR-030, FR-031
        """
        logger.info(f"[DEPLOY] 开始部署实例: {instance.name}")

        # 1. 创建数据目录
        instance_dir = self._create_instance_directories(instance.name)

        # 2. 生成并写入 Frigate 配置
        frigate_config = render_frigate_config(instance)
        config_file = instance_dir['config'] / 'config.yml'
        config_file.write_text(frigate_config, encoding='utf-8')

        logger.info(f"[DEPLOY] 配置文件已写入: {config_file}")

        # 3. 生成并写入 docker-compose.yml
        compose_config = render_docker_compose(instance)
        compose_file = instance_dir['root'] / 'docker-compose.yml'
        compose_file.write_text(compose_config, encoding='utf-8')

        logger.info(f"[DEPLOY] Docker Compose 文件已写入: {compose_file}")

        # 4. 拉取镜像（可选，失败不阻止）
        self._pull_image_if_needed('ghcr.io/blakeblackshear/frigate:stable')

        # 5. 启动容器
        container = self._start_container(instance)

        return {
            'success': True,
            'instance_name': instance.name,
            'container_id': container.id,
            'container_name': container.name,
            'status': container.status,
            'config_path': str(config_file),
            'compose_path': str(compose_file)
        }

    def _create_instance_directories(self, instance_name: str) -> Dict[str, Path]:
        """创建实例数据目录

        Args:
            instance_name: 实例名称

        Returns:
            Dict[str, Path]: 目录路径字典
        """
        instance_root = self.data_root / instance_name
        config_dir = instance_root / 'config'
        media_dir = instance_root / 'media'

        # 创建目录
        instance_root.mkdir(parents=True, exist_ok=True)
        config_dir.mkdir(exist_ok=True)
        media_dir.mkdir(exist_ok=True)

        logger.info(f"[DEPLOY] 创建目录: {instance_root}")

        return {
            'root': instance_root,
            'config': config_dir,
            'media': media_dir
        }

    def _pull_image_if_needed(self, image_name: str) -> bool:
        """拉取镜像（如果本地不存在）

        Args:
            image_name: 镜像名称

        Returns:
            bool: 拉取成功返回 True，失败返回 False（不抛异常）
        """
        try:
            client = self._get_docker_client()

            # 检查镜像是否存在
            try:
                client.images.get(image_name)
                logger.info(f"[DEPLOY] 镜像已存在: {image_name}")
                return True
            except docker.errors.ImageNotFound:
                pass

            # 拉取镜像
            logger.info(f"[DEPLOY] 开始拉取镜像: {image_name}")
            client.images.pull(image_name)
            logger.info(f"[DEPLOY] 镜像拉取成功: {image_name}")
            return True

        except Exception as e:
            logger.warning(f"[DEPLOY] 镜像拉取失败（将使用本地缓存）: {e}")
            return False

    def _start_container(self, instance: InstanceConfig) -> docker.models.containers.Container:
        """启动容器

        Args:
            instance: 实例配置

        Returns:
            Container: Docker 容器对象

        根据 FR-031: 启动容器并返回容器 ID
        """
        client = self._get_docker_client()

        container_name = f"frigate-instance-{instance.name}"
        instance_dir = self.data_root / instance.name

        # 构建容器配置
        container_config = {
            'image': 'ghcr.io/blakeblackshear/frigate:stable',
            'name': container_name,
            'detach': True,
            'restart_policy': {'Name': 'no'},  # FR-003
            'shm_size': '256m',
            'volumes': {
                str(instance_dir / 'config'): {'bind': '/config', 'mode': 'rw'},
                str(instance_dir / 'media'): {'bind': '/media/frigate', 'mode': 'rw'},
                '/etc/localtime': {'bind': '/etc/localtime', 'mode': 'ro'}
            },
            'environment': {
                'TZ': 'Asia/Shanghai'
            }
        }

        # 端口映射
        if instance.port_block and len(instance.port_block) >= 3:
            container_config['ports'] = {
                '5000/tcp': instance.port_block[0],  # WebUI
                '8554/tcp': instance.port_block[1],  # RTSP
                '8555/tcp': instance.port_block[2],  # WebRTC
            }

        # 硬件加速配置
        if instance.hw_mode == 'nvidia':
            container_config['runtime'] = 'nvidia'
            container_config['environment']['NVIDIA_VISIBLE_DEVICES'] = 'all'
        elif instance.hw_mode == 'hailo' and instance.hw_device:
            container_config['devices'] = [instance.hw_device]

        # 启动容器
        logger.info(f"[DEPLOY] 启动容器: {container_name}")

        try:
            container = client.containers.run(**container_config)
            logger.info(f"[DEPLOY] 容器已启动: {container.id[:12]}")
            return container

        except docker.errors.APIError as e:
            logger.error(f"[DEPLOY] 容器启动失败: {e}")
            raise RuntimeError(f"容器启动失败: {str(e)}")

    def stop_instance(self, instance_name: str) -> bool:
        """停止实例

        Args:
            instance_name: 实例名称

        Returns:
            bool: 成功返回 True
        """
        try:
            client = self._get_docker_client()
            container_name = f"frigate-instance-{instance_name}"

            container = client.containers.get(container_name)
            container.stop(timeout=10)

            logger.info(f"[DEPLOY] 容器已停止: {container_name}")
            return True

        except docker.errors.NotFound:
            logger.warning(f"[DEPLOY] 容器不存在: {container_name}")
            return False

        except Exception as e:
            logger.error(f"[DEPLOY] 停止容器失败: {e}")
            raise

    def remove_instance(self, instance_name: str, remove_volumes: bool = True) -> bool:
        """删除实例

        Args:
            instance_name: 实例名称
            remove_volumes: 是否删除数据卷

        Returns:
            bool: 成功返回 True
        """
        try:
            client = self._get_docker_client()
            container_name = f"frigate-instance-{instance_name}"

            # 停止并删除容器
            try:
                container = client.containers.get(container_name)
                container.stop(timeout=5)
                container.remove()
                logger.info(f"[DEPLOY] 容器已删除: {container_name}")
            except docker.errors.NotFound:
                logger.warning(f"[DEPLOY] 容器不存在（可能已删除）: {container_name}")

            # 删除数据目录（可选）
            if remove_volumes:
                import shutil
                instance_dir = self.data_root / instance_name
                if instance_dir.exists():
                    shutil.rmtree(instance_dir)
                    logger.info(f"[DEPLOY] 数据目录已删除: {instance_dir}")

            return True

        except Exception as e:
            logger.error(f"[DEPLOY] 删除实例失败: {e}")
            raise
