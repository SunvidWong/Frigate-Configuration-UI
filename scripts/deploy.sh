#!/bin/bash

# ================================
# Frigate Configuration UI 自动化部署脚本
# ================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装"
        exit 1
    fi
}

# 检查文件是否存在
check_file() {
    if [ ! -f "$1" ]; then
        log_error "文件 $1 不存在"
        exit 1
    fi
}

# 创建目录
create_directory() {
    if [ ! -d "$1" ]; then
        log_info "创建目录: $1"
        mkdir -p "$1"
    fi
}

# 备份现有部署
backup_deployment() {
    local backup_dir="/opt/frigate-ui/backups/deployment-$(date +%Y%m%d-%H%M%S)"
    
    if [ -d "/opt/frigate-ui" ]; then
        log_info "备份现有部署到: $backup_dir"
        create_directory "$backup_dir"
        
        # 备份配置文件
        if [ -f ".env.production" ]; then
            cp .env.production "$backup_dir/"
        fi
        
        # 备份数据库
        if docker-compose ps | grep -q postgres; then
            log_info "备份数据库..."
            docker-compose exec -T postgres pg_dump -U frigate frigate_config > "$backup_dir/database.sql"
        fi
        
        # 备份 Redis 数据
        if docker-compose ps | grep -q redis; then
            log_info "备份 Redis 数据..."
            docker-compose exec -T redis redis-cli --rdb /data/backup.rdb
            docker cp frigate-redis:/data/backup.rdb "$backup_dir/"
        fi
        
        log_success "备份完成"
    fi
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查必要命令
    check_command "docker"
    check_command "docker-compose"
    check_command "curl"
    check_command "openssl"
    
    # 检查 Docker 版本
    docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_info "Docker 版本: $docker_version"
    
    # 检查 Docker Compose 版本
    compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_info "Docker Compose 版本: $compose_version"
    
    # 检查可用内存
    available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_memory" -lt 2048 ]; then
        log_warning "可用内存不足 2GB，当前: ${available_memory}MB"
    fi
    
    # 检查可用磁盘空间
    available_disk=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$available_disk" -lt 10 ]; then
        log_warning "可用磁盘空间不足 10GB，当前: ${available_disk}GB"
    fi
    
    log_success "系统要求检查完成"
}

# 设置环境
setup_environment() {
    log_info "设置部署环境..."
    
    # 创建必要目录
    create_directory "/opt/frigate-ui/data/postgres"
    create_directory "/opt/frigate-ui/data/redis"
    create_directory "/opt/frigate-ui/data/prometheus"
    create_directory "/opt/frigate-ui/data/grafana"
    create_directory "/opt/frigate-ui/data/loki"
    create_directory "/opt/frigate-ui/logs"
    create_directory "/opt/frigate-ui/config"
    create_directory "/opt/frigate-ui/ssl"
    create_directory "/opt/frigate-ui/backups"
    
    # 设置权限
    sudo chown -R $USER:$USER /opt/frigate-ui
    sudo chmod -R 755 /opt/frigate-ui
    
    log_success "环境设置完成"
}

# 生成 SSL 证书
generate_ssl_cert() {
    local domain=${1:-localhost}
    local ssl_dir="./ssl"
    
    if [ ! -f "$ssl_dir/cert.pem" ] || [ ! -f "$ssl_dir/key.pem" ]; then
        log_info "生成自签名 SSL 证书..."
        
        create_directory "$ssl_dir"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$ssl_dir/key.pem" \
            -out "$ssl_dir/cert.pem" \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=$domain" \
            -config <(
                echo '[dn]'
                echo 'CN='$domain
                echo '[req]'
                echo 'distinguished_name = dn'
                echo '[extensions]'
                echo 'subjectAltName=DNS:'$domain',DNS:www.'$domain',DNS:localhost,IP:127.0.0.1'
                echo 'keyUsage=keyEncipherment,dataEncipherment'
                echo 'extendedKeyUsage=serverAuth'
            ) -extensions extensions
        
        log_success "SSL 证书生成完成"
    else
        log_info "SSL 证书已存在，跳过生成"
    fi
}

# 配置环境变量
configure_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f ".env.production" ]; then
        log_error ".env.production 文件不存在，请先创建并配置"
        exit 1
    fi
    
    # 检查必要的环境变量
    source .env.production
    
    if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "your_strong_postgres_password_here" ]; then
        log_error "请在 .env.production 中设置 POSTGRES_PASSWORD"
        exit 1
    fi
    
    if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "your_strong_redis_password_here" ]; then
        log_error "请在 .env.production 中设置 REDIS_PASSWORD"
        exit 1
    fi
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        log_warning "请在 .env.production 中设置正确的 DOMAIN"
    fi
    
    log_success "环境变量配置检查完成"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    # 构建主应用镜像
    docker-compose -f docker-compose.prod.yml build --no-cache frigate-config-ui
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local profile=${1:-""}
    
    log_info "启动服务..."
    
    if [ -n "$profile" ]; then
        docker-compose -f docker-compose.prod.yml --profile "$profile" up -d
    else
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost/health > /dev/null 2>&1; then
            log_success "服务已就绪"
            return 0
        fi
        
        log_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "服务启动超时"
    return 1
}

# 运行健康检查
health_check() {
    log_info "运行健康检查..."
    
    # 检查主应用
    if curl -f -s http://localhost/api/system/info > /dev/null; then
        log_success "主应用健康检查通过"
    else
        log_error "主应用健康检查失败"
        return 1
    fi
    
    # 检查数据库
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U frigate > /dev/null; then
        log_success "数据库健康检查通过"
    else
        log_error "数据库健康检查失败"
        return 1
    fi
    
    # 检查 Redis
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping > /dev/null; then
        log_success "Redis 健康检查通过"
    else
        log_error "Redis 健康检查失败"
        return 1
    fi
    
    log_success "所有健康检查通过"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "==================================="
    echo "  Frigate Configuration UI 已部署"
    echo "==================================="
    echo
    echo "访问地址:"
    echo "  主应用: https://$DOMAIN (或 https://localhost)"
    echo "  健康检查: https://$DOMAIN/health"
    echo
    echo "管理命令:"
    echo "  查看状态: docker-compose -f docker-compose.prod.yml ps"
    echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
    echo
    echo "监控面板 (如果启用):"
    echo "  Grafana: https://$DOMAIN/grafana (admin/\$GRAFANA_PASSWORD)"
    echo "  Prometheus: https://$DOMAIN/prometheus"
    echo
    echo "数据目录: /opt/frigate-ui/data"
    echo "日志目录: /opt/frigate-ui/logs"
    echo "备份目录: /opt/frigate-ui/backups"
    echo
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "部署失败，正在清理..."
        docker-compose -f docker-compose.prod.yml down --remove-orphans
    fi
}

# 主函数
main() {
    local mode=${1:-"basic"}
    local domain=${2:-"localhost"}
    
    echo "==================================="
    echo "  Frigate Configuration UI 部署脚本"
    echo "==================================="
    echo
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 检查是否为 root 用户
    if [ "$EUID" -eq 0 ]; then
        log_error "请不要使用 root 用户运行此脚本"
        exit 1
    fi
    
    # 检查必要文件
    check_file "docker-compose.prod.yml"
    check_file ".env.production"
    
    # 执行部署步骤
    check_requirements
    setup_environment
    backup_deployment
    generate_ssl_cert "$domain"
    configure_environment
    build_images
    
    case $mode in
        "basic")
            start_services
            ;;
        "database")
            start_services "database"
            ;;
        "monitoring")
            start_services "monitoring"
            ;;
        "full")
            start_services "database"
            sleep 10
            start_services "monitoring"
            ;;
        *)
            log_error "未知的部署模式: $mode"
            echo "支持的模式: basic, database, monitoring, full"
            exit 1
            ;;
    esac
    
    wait_for_services
    health_check
    show_deployment_info
    
    log_success "部署脚本执行完成！"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [模式] [域名]"
    echo
    echo "模式:"
    echo "  basic      - 基础部署 (默认)"
    echo "  database   - 包含数据库的部署"
    echo "  monitoring - 包含监控的部署"
    echo "  full       - 完整部署 (数据库 + 监控)"
    echo
    echo "示例:"
    echo "  $0 basic localhost"
    echo "  $0 database your-domain.com"
    echo "  $0 full your-domain.com"
    echo
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"