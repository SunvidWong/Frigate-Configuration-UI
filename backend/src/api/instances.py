"""实例管理 API 端点

提供实例的创建、查询、删除等功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from src.models.camera_config import InstanceConfig, CameraConfig, create_single_channel_camera
from src.services.deployment_service import DeploymentService
from src.validators.port_validator import allocate_port_block
from src.validators.name_validator import validate_instance_name

router = APIRouter(prefix="/api/instances", tags=["instances"])

# 全局部署服务实例
deployment_service = DeploymentService()


class DeployRequest(BaseModel):
    """部署请求模型"""
    instance_name: str
    hw_mode: str = "cpu"
    hw_device: Optional[str] = None
    cameras: List[dict]  # 简化的摄像头配置


class DeployResponse(BaseModel):
    """部署响应模型"""
    success: bool
    instance_name: str
    container_id: str
    container_name: str
    status: str
    message: str


@router.post("/deploy", response_model=DeployResponse)
async def deploy_instance(request: DeployRequest):
    """部署 Frigate 实例

    根据 FR-029: 使用 Docker SDK 部署
    根据 FR-030: 写入配置文件
    根据 FR-031: 启动容器
    """
    try:
        # 验证实例名称
        name_error = validate_instance_name(request.instance_name)
        if name_error:
            raise HTTPException(status_code=400, detail=name_error)

        # 分配端口块
        # TODO: 从数据库获取已使用的端口块
        port_block = allocate_port_block(start_port=5200, used_blocks=[])
        if not port_block:
            raise HTTPException(status_code=500, detail="端口分配失败，无可用端口")

        # 构建摄像头配置
        cameras = []
        for cam_data in request.cameras:
            camera = create_single_channel_camera(
                name=cam_data['name'],
                ip=cam_data['ip'],
                username=cam_data['username'],
                password=cam_data['password'],
                brand=cam_data.get('brand', 'generic'),
                main_stream_path=cam_data.get('main_stream_path', '/stream'),
                sub_stream_path=cam_data.get('sub_stream_path')
            )
            cameras.append(camera)

        # 创建实例配置
        instance = InstanceConfig(
            name=request.instance_name,
            hw_mode=request.hw_mode,
            hw_device=request.hw_device,
            cameras=cameras,
            port_block=port_block
        )

        # 部署实例
        result = deployment_service.deploy_instance(instance)

        return DeployResponse(
            success=True,
            instance_name=result['instance_name'],
            container_id=result['container_id'],
            container_name=result['container_name'],
            status=result['status'],
            message=f"实例部署成功，WebUI 端口: {port_block[0]}"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"部署失败: {str(e)}")


@router.get("/")
async def list_instances():
    """获取所有实例列表"""
    try:
        import docker

        client = docker.from_env()

        # 查找所有 frigate-instance-* 容器
        containers = client.containers.list(
            all=True,
            filters={'name': 'frigate-instance-'}
        )

        instances = []
        for container in containers:
            instance_name = container.name.replace('frigate-instance-', '')

            instances.append({
                'name': instance_name,
                'container_id': container.id[:12],
                'status': container.status,
                'image': container.image.tags[0] if container.image.tags else 'unknown',
                'created': container.attrs['Created']
            })

        return {
            'success': True,
            'instances': instances,
            'count': len(instances)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取实例列表失败: {str(e)}")


@router.get("/{instance_name}")
async def get_instance(instance_name: str):
    """获取单个实例详情"""
    try:
        import docker

        client = docker.from_env()
        container_name = f"frigate-instance-{instance_name}"

        container = client.containers.get(container_name)

        # 提取端口映射
        ports = {}
        if container.attrs.get('NetworkSettings', {}).get('Ports'):
            for internal, external in container.attrs['NetworkSettings']['Ports'].items():
                if external:
                    ports[internal] = external[0]['HostPort']

        return {
            'success': True,
            'instance': {
                'name': instance_name,
                'container_id': container.id,
                'status': container.status,
                'image': container.image.tags[0] if container.image.tags else 'unknown',
                'ports': ports,
                'created': container.attrs['Created'],
                'config': container.attrs.get('Config', {})
            }
        }

    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"实例不存在: {instance_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{instance_name}")
async def delete_instance(instance_name: str, remove_data: bool = True):
    """删除实例

    Args:
        instance_name: 实例名称
        remove_data: 是否删除数据目录（默认 True）
    """
    try:
        deployment_service.remove_instance(instance_name, remove_volumes=remove_data)

        return {
            'success': True,
            'message': f"实例 {instance_name} 已删除"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除实例失败: {str(e)}")


@router.post("/{instance_name}/stop")
async def stop_instance(instance_name: str):
    """停止实例"""
    try:
        deployment_service.stop_instance(instance_name)

        return {
            'success': True,
            'message': f"实例 {instance_name} 已停止"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"停止实例失败: {str(e)}")


@router.post("/{instance_name}/start")
async def start_instance(instance_name: str):
    """启动实例"""
    try:
        import docker

        client = docker.from_env()
        container_name = f"frigate-instance-{instance_name}"

        container = client.containers.get(container_name)
        container.start()

        return {
            'success': True,
            'message': f"实例 {instance_name} 已启动"
        }

    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail=f"实例不存在: {instance_name}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动实例失败: {str(e)}")
