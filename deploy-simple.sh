#!/bin/bash

# 简化版远程部署脚本
# 用于在云服务器或VPS上快速部署 Frigate Configuration UI

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查 Docker Compose 是否安装
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
        echo "安装命令: sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        echo "         sudo chmod +x /usr/local/bin/docker-compose"
        exit 1
    fi
    
    success "Docker Compose 检查通过"
}

# 创建必要的目录
create_directories() {
    info "创建必要的目录..."
    mkdir -p data config
    success "目录创建完成"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# 设置环境变量
setup_env() {
    if [ ! -f .env ]; then
        info "设置环境变量..."
        cp .env.simple .env
        
        # 生成随机密码
        POSTGRES_PASSWORD=$(generate_password)
        
        # 替换密码
        sed -i "s/your_secure_password_here/$POSTGRES_PASSWORD/g" .env
        
        success "环境变量文件已创建"
        warning "请编辑 .env 文件，修改域名等配置:"
        warning "  - DOMAIN: 设置你的域名"
        warning "  - HTTP_PORT: 设置HTTP端口（默认80）"
        echo ""
        warning "生成的数据库密码: $POSTGRES_PASSWORD"
    else
        info "环境变量文件已存在，跳过创建"
    fi
}

# 拉取最新镜像
pull_images() {
    info "拉取最新镜像..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.simple.yml pull
    else
        docker compose -f docker-compose.simple.yml pull
    fi
    
    success "镜像拉取完成"
}

# 启动服务
start_services() {
    info "启动服务..."
    
    # 使用 docker-compose 或 docker compose
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.simple.yml up -d
    else
        docker compose -f docker-compose.simple.yml up -d
    fi
    
    success "服务启动完成"
}

# 显示访问信息
show_access_info() {
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")
    
    echo ""
    echo "=========================================="
    success "远程部署完成！"
    echo "=========================================="
    echo ""
    echo "访问地址:"
    echo "  http://$SERVER_IP"
    echo "  或者 http://your-domain.com (如果已配置域名)"
    echo ""
    echo "服务状态检查:"
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.simple.yml ps
    else
        docker compose -f docker-compose.simple.yml ps
    fi
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker logs frigate-config-ui"
    echo "  重启服务: docker restart frigate-config-ui"
    if command -v docker-compose &> /dev/null; then
        echo "  停止服务: docker-compose -f docker-compose.simple.yml down"
        echo "  更新服务: docker-compose -f docker-compose.simple.yml pull && docker-compose -f docker-compose.simple.yml up -d"
    else
        echo "  停止服务: docker compose -f docker-compose.simple.yml down"
        echo "  更新服务: docker compose -f docker-compose.simple.yml pull && docker compose -f docker-compose.simple.yml up -d"
    fi
    echo ""
}

# 主函数
main() {
    echo "=========================================="
    info "Frigate Configuration UI 简化版远程部署"
    echo "=========================================="
    echo ""
    
    check_docker
    check_docker_compose
    create_directories
    setup_env
    pull_images
    start_services
    show_access_info
}

# 运行主函数
main "$@"