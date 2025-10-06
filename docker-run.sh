#!/bin/bash

# 单Docker容器部署脚本
# 使用远程镜像快速部署 Frigate Configuration UI

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
CONTAINER_NAME="frigate-config-ui"
IMAGE_NAME="ghcr.io/sunvidwong/frigate-config-ui:latest"
HOST_PORT="80"
CONTAINER_PORT="5550"
DATA_DIR="./data"
CONFIG_DIR="./config"

# 日志函数
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
        echo "安装命令: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker 服务未运行，请启动 Docker"
        echo "启动命令: sudo systemctl start docker"
        exit 1
    fi
    
    success "Docker 检查通过"
}

# 创建必要的目录
create_directories() {
    info "创建必要的目录..."
    mkdir -p "$DATA_DIR" "$CONFIG_DIR"
    success "目录创建完成: $DATA_DIR, $CONFIG_DIR"
}

# 停止并删除现有容器
cleanup_existing() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        info "发现现有容器，正在清理..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        success "现有容器已清理"
    fi
}

# 拉取最新镜像
pull_image() {
    info "拉取最新镜像: $IMAGE_NAME"
    docker pull "$IMAGE_NAME"
    success "镜像拉取完成"
}

# 运行容器
run_container() {
    info "启动容器..."
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "$HOST_PORT:$CONTAINER_PORT" \
        -e NODE_ENV=production \
        -e PORT="$CONTAINER_PORT" \
        -e TZ=Asia/Shanghai \
        -v "$(pwd)/$CONFIG_DIR:/app/config" \
        -v "$(pwd)/$DATA_DIR:/app/data" \
        --restart unless-stopped \
        "$IMAGE_NAME"
    
    success "容器启动完成"
}

# 等待服务启动
wait_for_service() {
    info "等待服务启动..."
    sleep 5
    
    # 检查容器状态
    if docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -q "$CONTAINER_NAME.*Up"; then
        success "服务启动成功"
    else
        error "服务启动失败，请检查日志"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
}

# 显示访问信息
show_access_info() {
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")
    
    echo ""
    echo "=========================================="
    success "单Docker容器部署完成！"
    echo "=========================================="
    echo ""
    echo "📦 容器信息:"
    echo "  容器名称: $CONTAINER_NAME"
    echo "  镜像地址: $IMAGE_NAME"
    echo "  端口映射: $HOST_PORT:$CONTAINER_PORT"
    echo ""
    echo "🌐 访问地址:"
    echo "  http://$SERVER_IP"
    echo "  http://localhost (如果是本地部署)"
    echo ""
    echo "📁 数据目录:"
    echo "  配置文件: $(pwd)/$CONFIG_DIR"
    echo "  数据文件: $(pwd)/$DATA_DIR"
    echo ""
    echo "🔧 常用命令:"
    echo "  查看状态: docker ps | grep $CONTAINER_NAME"
    echo "  查看日志: docker logs $CONTAINER_NAME"
    echo "  进入容器: docker exec -it $CONTAINER_NAME sh"
    echo "  重启容器: docker restart $CONTAINER_NAME"
    echo "  停止容器: docker stop $CONTAINER_NAME"
    echo "  删除容器: docker rm $CONTAINER_NAME"
    echo ""
    echo "🔄 更新应用:"
    echo "  ./docker-run.sh update"
    echo ""
}

# 更新容器
update_container() {
    info "更新容器..."
    cleanup_existing
    pull_image
    run_container
    wait_for_service
    success "容器更新完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start   - 启动容器 (默认)"
    echo "  update  - 更新容器"
    echo "  stop    - 停止容器"
    echo "  logs    - 查看日志"
    echo "  status  - 查看状态"
    echo "  help    - 显示帮助"
    echo ""
}

# 主函数
main() {
    case "${1:-start}" in
        "start")
            echo "=========================================="
            info "Frigate Configuration UI 单Docker部署"
            echo "=========================================="
            echo ""
            
            check_docker
            create_directories
            cleanup_existing
            pull_image
            run_container
            wait_for_service
            show_access_info
            ;;
        "update")
            check_docker
            update_container
            show_access_info
            ;;
        "stop")
            info "停止容器..."
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            success "容器已停止"
            ;;
        "logs")
            docker logs -f "$CONTAINER_NAME"
            ;;
        "status")
            docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "(NAMES|$CONTAINER_NAME)"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"