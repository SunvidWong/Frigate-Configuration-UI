"""Frigate Configuration UI - 应用入口点

根据 FR-002: MUST 快速失败（Fast-Fail）原则
根据 FR-003: MUST restart="no" 避免无限重启
根据 FR-005: WebUI 固定端口 9888
"""
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.services.preflight import (
    check_docker_socket,
    check_docker_daemon,
    check_image_local
)
from src.api.validate import router as validate_router
from src.api.camera import router as camera_router
from src.api.instances import router as instances_router
from src.api.network import router as network_router


# 创建 FastAPI 应用
app = FastAPI(
    title="Frigate Configuration UI",
    description="配置与部署 Frigate 实例的 WebUI",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(validate_router)
app.include_router(camera_router)
app.include_router(instances_router)
app.include_router(network_router)  # FIX-001: 网络检测 API


def run_preflight_checks() -> bool:
    """执行启动预检

    根据 FR-002 快速失败原则，任何预检失败都应立即退出

    Returns:
        bool: True 如果所有检查通过，False 如果任何检查失败

    执行顺序:
        1. Docker socket 检查 (FR-001)
        2. Docker daemon 连通性检查
        3. Frigate 镜像本地检查（仅警告，不阻止启动）
    """
    print("[PREFLIGHT] 开始启动预检...\n", flush=True)

    # 检查 1: Docker socket
    print("[PREFLIGHT] 检查 Docker socket 挂载...", flush=True)
    if not check_docker_socket():
        print("[PREFLIGHT] ❌ 预检失败: Docker socket 不可用", flush=True)
        return False
    print("[PREFLIGHT] ✅ Docker socket 正常\n", flush=True)

    # 检查 2: Docker daemon 连通性
    print("[PREFLIGHT] 检查 Docker daemon 连通性...", flush=True)
    if not check_docker_daemon():
        print("[PREFLIGHT] ❌ 预检失败: Docker daemon 不可达", flush=True)
        return False
    print("[PREFLIGHT] ✅ Docker daemon 正常\n", flush=True)

    # 检查 3: Frigate 镜像（仅警告）
    print("[PREFLIGHT] 检查 Frigate 镜像缓存...", flush=True)
    image_result = check_image_local("ghcr.io/blakeblackshear/frigate:stable")
    if image_result["exists"]:
        if image_result["warning"]:
            print("[PREFLIGHT] ⚠️  镜像缓存已过期（不阻止启动）", flush=True)
        else:
            print("[PREFLIGHT] ✅ Frigate 镜像已缓存", flush=True)
    else:
        print("[PREFLIGHT] ℹ️  本地无镜像缓存（首次部署时会拉取）", flush=True)

    print("\n[PREFLIGHT] ✅ 所有预检通过\n", flush=True)
    return True


@app.on_event("startup")
async def startup_event():
    """应用启动事件处理

    执行预检并根据结果决定是否继续启动
    """
    if not run_preflight_checks():
        print("[ERROR] 预检失败，应用即将退出（符合 FR-002 快速失败原则）", flush=True)
        sys.exit(1)  # 非零退出码，配合 restart="no" 实现快速失败


@app.get("/api/health")
async def health_check():
    """健康检查端点

    Returns:
        dict: 健康状态
    """
    return {
        "status": "healthy",
        "service": "frigate-config-ui"
    }


@app.get("/")
async def root():
    """根路径

    Returns:
        dict: API 信息
    """
    return {
        "message": "Frigate Configuration UI API",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn

    # 开发环境启动
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=9888,  # FR-005: 固定端口
        reload=True
    )
