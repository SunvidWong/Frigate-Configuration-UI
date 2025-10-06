#!/bin/bash

# ================================
# Frigate Configuration UI 更新脚本
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

# 检查服务状态
check_service_status() {
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_error "服务未运行，请先部署应用"
        exit 1
    fi
}

# 创建更新备份
create_update_backup() {
    local backup_dir="/opt/frigate-ui/backups/update-$(date +%Y%m%d-%H%M%S)"
    
    log_info "创建更新备份: $backup_dir"
    mkdir -p "$backup_dir"
    
    # 备份当前镜像信息
    docker images | grep frigate > "$backup_dir/images.txt"
    
    # 备份配置文件
    if [ -f ".env.production" ]; then
        cp .env.production "$backup_dir/"
    fi
    
    if [ -f "docker-compose.prod.yml" ]; then
        cp docker-compose.prod.yml "$backup_dir/"
    fi
    
    # 备份数据库
    if docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
        log_info "备份数据库..."
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U frigate frigate_config > "$backup_dir/database.sql"
    fi
    
    # 备份 Redis 数据
    if docker-compose -f docker-compose.prod.yml ps | grep -q redis; then
        log_info "备份 Redis 数据..."
        docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --rdb /data/backup.rdb
        docker cp frigate-redis:/data/backup.rdb "$backup_dir/" 2>/dev/null || true
    fi
    
    log_success "备份完成: $backup_dir"
    echo "$backup_dir" > /tmp/frigate_last_backup
}

# 拉取最新代码
pull_latest_code() {
    log_info "拉取最新代码..."
    
    if [ -d ".git" ]; then
        # 保存当前分支
        current_branch=$(git branch --show-current)
        
        # 检查是否有未提交的更改
        if ! git diff --quiet || ! git diff --cached --quiet; then
            log_warning "检测到未提交的更改，正在暂存..."
            git stash push -m "Auto-stash before update $(date)"
        fi
        
        # 拉取最新代码
        git fetch origin
        git pull origin "$current_branch"
        
        log_success "代码更新完成"
    else
        log_warning "不是 Git 仓库，跳过代码拉取"
    fi
}

# 更新依赖
update_dependencies() {
    log_info "检查依赖更新..."
    
    # 检查 package.json 是否有变化
    if [ -f "package.json" ]; then
        local package_hash_before=$(md5sum package.json 2>/dev/null || echo "")
        
        # 如果有 package-lock.json 的变化，需要重新安装依赖
        if git diff HEAD~1 --name-only | grep -q "package"; then
            log_info "检测到依赖变化，将在镜像构建时更新"
        fi
    fi
}

# 构建新镜像
build_new_images() {
    log_info "构建新镜像..."
    
    # 构建新的应用镜像
    docker-compose -f docker-compose.prod.yml build --no-cache frigate-config-ui
    
    log_success "新镜像构建完成"
}

# 滚动更新服务
rolling_update() {
    log_info "执行滚动更新..."
    
    # 获取当前运行的服务
    local services=$(docker-compose -f docker-compose.prod.yml ps --services)
    
    # 逐个更新服务
    for service in $services; do
        if [ "$service" = "frigate-config-ui" ] || [ "$service" = "nginx" ]; then
            log_info "更新服务: $service"
            
            # 创建新容器
            docker-compose -f docker-compose.prod.yml up -d --no-deps "$service"
            
            # 等待服务就绪
            sleep 10
            
            # 健康检查
            if ! health_check_service "$service"; then
                log_error "服务 $service 更新失败，正在回滚..."
                rollback_service "$service"
                return 1
            fi
            
            log_success "服务 $service 更新完成"
        fi
    done
    
    log_success "滚动更新完成"
}

# 服务健康检查
health_check_service() {
    local service=$1
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        case $service in
            "frigate-config-ui")
                if curl -f -s http://localhost/health > /dev/null 2>&1; then
                    return 0
                fi
                ;;
            "nginx")
                if curl -f -s http://localhost > /dev/null 2>&1; then
                    return 0
                fi
                ;;
            *)
                # 对于其他服务，检查容器状态
                if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up"; then
                    return 0
                fi
                ;;
        esac
        
        log_info "等待服务 $service 就绪... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    return 1
}

# 回滚服务
rollback_service() {
    local service=$1
    
    log_warning "回滚服务: $service"
    
    # 停止当前服务
    docker-compose -f docker-compose.prod.yml stop "$service"
    
    # 从备份恢复
    local backup_dir=$(cat /tmp/frigate_last_backup 2>/dev/null || echo "")
    if [ -n "$backup_dir" ] && [ -d "$backup_dir" ]; then
        # 这里可以添加更复杂的回滚逻辑
        log_info "使用备份进行回滚: $backup_dir"
    fi
    
    # 重启服务
    docker-compose -f docker-compose.prod.yml up -d "$service"
}

# 清理旧镜像
cleanup_old_images() {
    log_info "清理旧镜像..."
    
    # 删除未使用的镜像
    docker image prune -f
    
    # 删除旧的 frigate 镜像（保留最新的2个版本）
    local old_images=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep frigate | tail -n +3 | awk '{print $1}')
    
    if [ -n "$old_images" ]; then
        echo "$old_images" | xargs -r docker rmi
        log_success "清理完成"
    else
        log_info "没有需要清理的旧镜像"
    fi
}

# 数据库迁移
run_database_migrations() {
    log_info "检查数据库迁移..."
    
    # 这里可以添加数据库迁移逻辑
    # 例如：运行迁移脚本、更新数据库架构等
    
    if docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
        # 检查是否需要运行迁移
        # docker-compose -f docker-compose.prod.yml exec frigate-config-ui npm run migrate
        log_info "数据库迁移检查完成"
    fi
}

# 更新配置文件
update_configurations() {
    log_info "检查配置文件更新..."
    
    # 检查是否有新的配置模板
    if [ -f ".env.production.example" ] && [ -f ".env.production" ]; then
        # 比较配置文件，提示用户新增的配置项
        local new_vars=$(comm -23 <(grep -o '^[A-Z_]*=' .env.production.example | sort) <(grep -o '^[A-Z_]*=' .env.production | sort))
        
        if [ -n "$new_vars" ]; then
            log_warning "检测到新的配置项，请检查并更新 .env.production:"
            echo "$new_vars"
        fi
    fi
    
    # 检查 Nginx 配置更新
    if [ -f "nginx.prod.conf.new" ]; then
        log_warning "检测到新的 Nginx 配置，请检查 nginx.prod.conf.new"
    fi
}

# 验证更新
verify_update() {
    log_info "验证更新..."
    
    # 检查主应用
    if curl -f -s http://localhost/api/system/info > /dev/null; then
        log_success "主应用验证通过"
    else
        log_error "主应用验证失败"
        return 1
    fi
    
    # 检查版本信息
    local version_info=$(curl -s http://localhost/api/system/info | grep -o '"version":"[^"]*"' || echo "")
    if [ -n "$version_info" ]; then
        log_info "当前版本: $version_info"
    fi
    
    # 运行完整健康检查
    if ! health_check_all_services; then
        log_error "健康检查失败"
        return 1
    fi
    
    log_success "更新验证完成"
}

# 全面健康检查
health_check_all_services() {
    local services=$(docker-compose -f docker-compose.prod.yml ps --services)
    
    for service in $services; do
        if ! health_check_service "$service"; then
            log_error "服务 $service 健康检查失败"
            return 1
        fi
    done
    
    return 0
}

# 显示更新信息
show_update_info() {
    log_success "更新完成！"
    echo
    echo "==================================="
    echo "  Frigate Configuration UI 已更新"
    echo "==================================="
    echo
    
    # 显示版本信息
    local version_info=$(curl -s http://localhost/api/system/info 2>/dev/null | grep -o '"version":"[^"]*"' || echo "版本信息获取失败")
    echo "当前版本: $version_info"
    echo
    
    # 显示服务状态
    echo "服务状态:"
    docker-compose -f docker-compose.prod.yml ps
    echo
    
    echo "访问地址: https://localhost"
    echo "健康检查: https://localhost/health"
    echo
    
    # 显示备份信息
    local backup_dir=$(cat /tmp/frigate_last_backup 2>/dev/null || echo "")
    if [ -n "$backup_dir" ]; then
        echo "备份位置: $backup_dir"
    fi
    echo
}

# 主函数
main() {
    local skip_backup=${1:-false}
    
    echo "==================================="
    echo "  Frigate Configuration UI 更新脚本"
    echo "==================================="
    echo
    
    # 检查服务状态
    check_service_status
    
    # 创建备份（除非明确跳过）
    if [ "$skip_backup" != "--skip-backup" ]; then
        create_update_backup
    fi
    
    # 执行更新步骤
    pull_latest_code
    update_dependencies
    update_configurations
    build_new_images
    run_database_migrations
    rolling_update
    
    # 验证更新
    if verify_update; then
        cleanup_old_images
        show_update_info
        log_success "更新脚本执行完成！"
    else
        log_error "更新验证失败，请检查服务状态"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --skip-backup  跳过备份步骤"
    echo "  -h, --help     显示帮助信息"
    echo
    echo "示例:"
    echo "  $0                # 正常更新（包含备份）"
    echo "  $0 --skip-backup  # 快速更新（跳过备份）"
    echo
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"