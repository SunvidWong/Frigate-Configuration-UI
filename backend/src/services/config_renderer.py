"""Frigate 配置渲染服务

根据 FR-025: 生成 Frigate YAML 配置
根据 FR-026: 支持硬件加速配置（CPU/NVIDIA/Hailo）
根据 FR-027: 生成 docker-compose.yml
"""
import yaml
from typing import Dict, List
from src.models.camera_config import InstanceConfig, CameraConfig


def render_frigate_config(instance: InstanceConfig) -> str:
    """渲染 Frigate 配置 YAML

    Args:
        instance: 实例配置对象

    Returns:
        str: Frigate YAML 配置内容

    根据 FR-025: 生成完整的 Frigate 配置
    """
    config = {
        'mqtt': {
            'enabled': False  # 默认禁用 MQTT（简化配置）
        },
        'detectors': _build_detector_config(instance.hw_mode, instance.hw_device),
        'cameras': _build_cameras_config(instance.cameras),
    }

    # 添加数据库配置
    config['database'] = {
        'path': '/data/frigate.db'
    }

    # 添加录像配置
    config['record'] = {
        'enabled': True,
        'retain': {
            'days': 7,
            'mode': 'motion'
        }
    }

    # 添加快照配置
    config['snapshots'] = {
        'enabled': True,
        'retain': {
            'default': 7
        }
    }

    return yaml.dump(config, default_flow_style=False, allow_unicode=True, sort_keys=False)


def _build_detector_config(hw_mode: str, hw_device: str = None) -> Dict:
    """构建检测器配置

    根据 FR-026: 支持 CPU/NVIDIA/Hailo 硬件加速
    """
    if hw_mode == 'nvidia':
        return {
            'coral': {
                'type': 'edgetpu',
                'device': 'usb'
            }
        }
    elif hw_mode == 'hailo':
        return {
            'hailo': {
                'type': 'hailo',
                'device': hw_device or '/dev/hailo0'
            }
        }
    else:
        # CPU 模式
        return {
            'cpu': {
                'type': 'cpu',
                'num_threads': 2
            }
        }


def _build_cameras_config(cameras: List[CameraConfig]) -> Dict:
    """构建摄像头配置

    根据 FR-023: 支持多通道
    根据 FR-024: 每个通道独立配置主/子码流
    """
    cameras_config = {}

    for camera in cameras:
        for channel in camera.channels:
            if not channel.enabled:
                continue

            # 构建 RTSP URL
            main_url = _build_full_rtsp_url(
                camera.ip,
                camera.username,
                camera.password,
                channel.main_stream.path,
                camera.port
            )

            camera_entry = {
                'ffmpeg': {
                    'inputs': [
                        {
                            'path': main_url,
                            'roles': ['detect', 'record']
                        }
                    ]
                },
                'detect': {
                    'enabled': channel.detect_enabled,
                    'width': 1280,
                    'height': 720,
                    'fps': 5
                },
                'record': {
                    'enabled': channel.record_enabled
                },
                'snapshots': {
                    'enabled': True
                }
            }

            # 添加子码流（如果有）
            if channel.sub_stream and channel.sub_stream.enabled:
                sub_url = _build_full_rtsp_url(
                    camera.ip,
                    camera.username,
                    camera.password,
                    channel.sub_stream.path,
                    camera.port
                )

                camera_entry['ffmpeg']['inputs'].append({
                    'path': sub_url,
                    'roles': ['detect']  # 子码流用于检测
                })

            cameras_config[channel.name] = camera_entry

    return cameras_config


def _build_full_rtsp_url(
    ip: str,
    username: str,
    password: str,
    path: str,
    port: int = 554
) -> str:
    """构建完整的 RTSP URL"""
    return f"rtsp://{username}:{password}@{ip}:{port}{path}"


def render_docker_compose(instance: InstanceConfig) -> str:
    """渲染 docker-compose.yml 配置

    根据 FR-027: 生成 docker-compose.yml
    根据 FR-028: 端口映射使用分配的端口块
    """
    container_name = f"frigate-instance-{instance.name}"

    # 基础服务配置
    service = {
        'image': 'ghcr.io/blakeblackshear/frigate:stable',
        'container_name': container_name,
        'restart': 'no',  # FR-003: 快速失败原则
        'shm_size': '256mb',
        'volumes': [
            f'./data/instances/{instance.name}/config:/config',
            f'./data/instances/{instance.name}/media:/media/frigate',
            '/etc/localtime:/etc/localtime:ro'
        ],
        'environment': {
            'TZ': 'Asia/Shanghai'
        }
    }

    # 端口映射（使用分配的端口块）
    if instance.port_block and len(instance.port_block) >= 3:
        service['ports'] = [
            f'{instance.port_block[0]}:5000',  # WebUI
            f'{instance.port_block[1]}:8554',  # RTSP
            f'{instance.port_block[2]}:8555',  # WebRTC
        ]

    # 硬件加速配置
    if instance.hw_mode == 'nvidia':
        service['runtime'] = 'nvidia'
        service['environment']['NVIDIA_VISIBLE_DEVICES'] = 'all'
    elif instance.hw_mode == 'hailo':
        service['devices'] = [instance.hw_device or '/dev/hailo0']

    compose = {
        'version': '3.9',
        'services': {
            container_name: service
        }
    }

    return yaml.dump(compose, default_flow_style=False, sort_keys=False)
