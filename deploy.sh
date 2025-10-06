#!/bin/bash

# Frigate Configuration UI Docker 部署脚本
# 使用方法: ./deploy.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_NAME="frigate-config-ui"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.docker"

# 函数定义
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
Frigate Configuration UI Docker 部署脚本

使用方法:
    $0 [选项]

选项:
    -h, --help          显示此帮助信息
    -b, --build         强制重新构建镜像
    -d, --dev           开发模式部署
    -p, --prod          生产模式部署 (默认)
    -f, --full          完整部署 (包含数据库和监控)
    -s, --stop          停止所有服务
    -r, --restart       重启服务
    -l, --logs          查看日志
    -c, --clean         清理所有数据
    -u, --update        更新到最新版本

示例:
    $0                  # 基础生产部署
    $0 --full           # 完整服务栈部署
    $0 --dev            # 开发模式部署
    $0 --logs           # 查看服务日志
    $0 --clean          # 清理所有数据

EOF
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

setup_environment() {
    log_info "设置环境配置..."

    if [ ! -f ".env" ]; then
        log_info "复制环境变量配置文件..."
        cp $ENV_FILE .env
        log_success "环境配置文件已创建: .env"
    else
        log_warning "环境配置文件已存在，跳过复制"
    fi

    # 创建必要的目录
    log_info "创建数据目录..."
    mkdir -p config logs data ssl
    log_success "数据目录已创建"
}

build_images() {
    if [ "$FORCE_BUILD" = true ]; then
        log_info "强制重新构建镜像..."
        docker-compose build --no-cache
    else
        log_info "构建Docker镜像..."
        docker-compose build
    fi
    log_success "镜像构建完成"
}

deploy_services() {
    local compose_cmd="docker-compose"

    if [ "$FULL_DEPLOY" = true ]; then
        log_info "启动完整服务栈 (包含数据库和监控)..."
        compose_cmd="$compose_cmd --profile database --profile monitoring"
    else
        log_info "启动基础服务..."
    fi

    if [ "$DEV_MODE" = true ]; then
        log_info "开发模式部署..."
        compose_cmd="$compose_cmd -f docker-compose.yml -f docker-compose.dev.yml"
    fi

    $compose_cmd up -d
    log_success "服务部署完成"
}

show_status() {
    log_info "服务状态:"
    docker-compose ps

    echo ""
    log_info "服务访问地址:"
    echo "  🌐 主应用: http://localhost"
    echo "  📡 API接口: http://localhost/api"
    echo "  🔌 WebSocket: ws://localhost/ws"

    if [ "$FULL_DEPLOY" = true ]; then
        echo "  📊 Grafana: http://localhost:3000"
        echo "  📈 Prometheus: http://localhost:9090"
    fi
}

stop_services() {
    log_info "停止所有服务..."
    docker-compose down
    log_success "服务已停止"
}

restart_services() {
    log_info "重启服务..."
    docker-compose restart
    log_success "服务已重启"
}

show_logs() {
    local service=""
    if [ -n "$1" ]; then
        service="$1"
        log_info "查看服务 $service 的日志..."
        docker-compose logs -f $service
    else
        log_info "查看所有服务日志..."
        docker-compose logs -f
    fi
}

clean_all() {
    log_warning "这将删除所有容器、镜像和数据卷，确认继续吗？ (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "清理所有Docker资源..."
        docker-compose down -v --rmi all
        docker system prune -f
        log_success "清理完成"
    else
        log_info "取消清理操作"
    fi
}

update_project() {
    log_info "更新项目到最新版本..."
    git pull origin main

    log_info "重新构建和部署..."
    FORCE_BUILD=true
    build_images
    deploy_services
    log_success "更新完成"
}

# 参数解析
DEV_MODE=false
FORCE_BUILD=false
FULL_DEPLOY=false
STOP_ONLY=false
RESTART_ONLY=false
SHOW_LOGS=false
CLEAN_ONLY=false
UPDATE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--build)
            FORCE_BUILD=true
            shift
            ;;
        -d|--dev)
            DEV_MODE=true
            shift
            ;;
        -p|--prod)
            DEV_MODE=false
            shift
            ;;
        -f|--full)
            FULL_DEPLOY=true
            shift
            ;;
        -s|--stop)
            STOP_ONLY=true
            shift
            ;;
        -r|--restart)
            RESTART_ONLY=true
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -c|--clean)
            CLEAN_ONLY=true
            shift
            ;;
        -u|--update)
            UPDATE_ONLY=true
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主逻辑
main() {
    log_info "🚀 Frigate Configuration UI Docker 部署脚本"

    check_docker

    if [ "$STOP_ONLY" = true ]; then
        stop_services
        exit 0
    fi

    if [ "$RESTART_ONLY" = true ]; then
        restart_services
        show_status
        exit 0
    fi

    if [ "$SHOW_LOGS" = true ]; then
        show_logs
        exit 0
    fi

    if [ "$CLEAN_ONLY" = true ]; then
        clean_all
        exit 0
    fi

    if [ "$UPDATE_ONLY" = true ]; then
        update_project
        show_status
        exit 0
    fi

    # 正常部署流程
    setup_environment
    build_images
    deploy_services
    show_status

    log_success "🎉 部署完成！"
}

# 执行主函数
main