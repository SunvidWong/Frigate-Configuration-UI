#!/bin/bash

# Frigate Configuration UI - 远程部署脚本
# 支持自动拉取镜像和一键部署

set -e

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

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    check_command docker
    check_command docker-compose
    
    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 创建环境配置文件
create_env_file() {
    log_info "创建环境配置文件..."
    
    if [ ! -f .env ]; then
        if [ -f .env.remote ]; then
            cp .env.remote .env
            log_info "已复制 .env.remote 为 .env"
        else
            log_error ".env.remote 模板文件不存在"
            exit 1
        fi
    fi
    
    # 生成随机密码
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)
    SESSION_SECRET=$(generate_password)
    ENCRYPTION_KEY=$(generate_password)
    
    # 更新 .env 文件中的密码
    sed -i.bak "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env
    sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
    sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
    
    # 删除备份文件
    rm -f .env.bak
    
    log_success "环境配置文件创建完成"
    log_warning "请编辑 .env 文件，设置您的域名和其他配置"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p data/{postgres,redis}
    mkdir -p logs/{app,nginx,healthcheck}
    mkdir -p config
    mkdir -p uploads
    mkdir -p backups
    mkdir -p ssl
    mkdir -p nginx/conf.d
    
    # 设置权限
    chmod 755 data logs config uploads backups ssl nginx
    chmod 700 data/postgres data/redis
    
    log_success "目录创建完成"
}

# 创建 Nginx 配置
create_nginx_config() {
    log_info "创建 Nginx 配置..."
    
    if [ ! -f nginx/nginx.conf ]; then
        cat > nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
EOF
    fi
    
    if [ ! -f nginx/conf.d/default.conf ]; then
        cat > nginx/conf.d/default.conf << 'EOF'
# 健康检查端点
server {
    listen 80;
    server_name _;
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# 主站点配置
server {
    listen 80;
    server_name localhost;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 代理到主应用
    location / {
        proxy_pass http://frigate-config-ui:5550;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket 支持
    location /ws {
        proxy_pass http://frigate-config-ui:5550;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://frigate-config-ui:5550;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    fi
    
    log_success "Nginx 配置创建完成"
}

# 拉取最新镜像
pull_images() {
    log_info "拉取最新镜像..."
    
    # 使用 docker-compose 拉取镜像
    docker-compose -f docker-compose.remote.yml pull
    
    log_success "镜像拉取完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动核心服务
    docker-compose -f docker-compose.remote.yml up -d frigate-config-ui nginx postgres redis
    
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if docker-compose -f docker-compose.remote.yml ps | grep -q "Up"; then
        log_success "核心服务启动成功"
    else
        log_error "服务启动失败，请检查日志"
        docker-compose -f docker-compose.remote.yml logs
        exit 1
    fi
}

# 启动可选服务
start_optional_services() {
    read -p "是否启用自动更新服务？(y/n): " enable_auto_update
    if [[ $enable_auto_update =~ ^[Yy]$ ]]; then
        log_info "启动自动更新服务..."
        docker-compose -f docker-compose.remote.yml --profile auto-update up -d watchtower
        log_success "自动更新服务已启动"
    fi
    
    read -p "是否启用健康监控服务？(y/n): " enable_monitoring
    if [[ $enable_monitoring =~ ^[Yy]$ ]]; then
        log_info "启动健康监控服务..."
        docker-compose -f docker-compose.remote.yml --profile monitoring up -d healthcheck
        log_success "健康监控服务已启动"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "==================================="
    echo "  Frigate Configuration UI 部署信息"
    echo "==================================="
    echo
    echo "🌐 访问地址:"
    echo "   HTTP:  http://$(hostname -I | awk '{print $1}'):80"
    echo "   本地:  http://localhost:80"
    echo
    echo "📊 服务状态:"
    docker-compose -f docker-compose.remote.yml ps
    echo
    echo "📝 重要文件:"
    echo "   配置文件: .env"
    echo "   日志目录: ./logs/"
    echo "   数据目录: ./data/"
    echo "   备份目录: ./backups/"
    echo
    echo "🔧 常用命令:"
    echo "   查看状态: docker-compose -f docker-compose.remote.yml ps"
    echo "   查看日志: docker-compose -f docker-compose.remote.yml logs -f"
    echo "   重启服务: docker-compose -f docker-compose.remote.yml restart"
    echo "   停止服务: docker-compose -f docker-compose.remote.yml down"
    echo "   更新镜像: docker-compose -f docker-compose.remote.yml pull && docker-compose -f docker-compose.remote.yml up -d"
    echo
    echo "⚠️  注意事项:"
    echo "   1. 请妥善保管 .env 文件中的密码"
    echo "   2. 建议配置 HTTPS 和防火墙"
    echo "   3. 定期备份数据目录"
    echo
}

# 主函数
main() {
    echo "========================================"
    echo "  Frigate Configuration UI 远程部署脚本"
    echo "========================================"
    echo
    
    # 检查依赖
    check_dependencies
    
    # 创建配置
    create_env_file
    create_directories
    create_nginx_config
    
    # 拉取镜像并启动
    pull_images
    start_services
    start_optional_services
    
    # 显示部署信息
    show_deployment_info
}

# 处理命令行参数
case "${1:-}" in
    "pull")
        log_info "仅拉取最新镜像..."
        pull_images
        ;;
    "start")
        log_info "启动服务..."
        start_services
        ;;
    "stop")
        log_info "停止服务..."
        docker-compose -f docker-compose.remote.yml down
        ;;
    "restart")
        log_info "重启服务..."
        docker-compose -f docker-compose.remote.yml restart
        ;;
    "status")
        log_info "服务状态:"
        docker-compose -f docker-compose.remote.yml ps
        ;;
    "logs")
        docker-compose -f docker-compose.remote.yml logs -f
        ;;
    "update")
        log_info "更新服务..."
        docker-compose -f docker-compose.remote.yml pull
        docker-compose -f docker-compose.remote.yml up -d
        ;;
    "clean")
        log_warning "清理未使用的镜像和容器..."
        docker system prune -f
        ;;
    "help"|"-h"|"--help")
        echo "用法: $0 [命令]"
        echo
        echo "命令:"
        echo "  (无参数)  完整部署流程"
        echo "  pull      仅拉取最新镜像"
        echo "  start     启动服务"
        echo "  stop      停止服务"
        echo "  restart   重启服务"
        echo "  status    查看服务状态"
        echo "  logs      查看服务日志"
        echo "  update    更新并重启服务"
        echo "  clean     清理未使用的镜像"
        echo "  help      显示此帮助信息"
        ;;
    *)
        main
        ;;
esac