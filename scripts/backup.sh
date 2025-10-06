#!/bin/bash

# ================================
# Frigate Configuration UI 备份脚本
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

# 默认配置
BACKUP_BASE_DIR="/opt/frigate-ui/backups"
BACKUP_RETENTION_DAYS=30
COMPRESS_BACKUPS=true
REMOTE_BACKUP=false

# 加载配置文件
load_config() {
    if [ -f "backup.conf" ]; then
        source backup.conf
        log_info "加载备份配置文件"
    fi
}

# 创建备份目录
create_backup_dir() {
    local backup_type=$1
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_dir="$BACKUP_BASE_DIR/${backup_type}-${timestamp}"
    
    mkdir -p "$backup_dir"
    echo "$backup_dir"
}

# 备份数据库
backup_database() {
    local backup_dir=$1
    
    log_info "备份 PostgreSQL 数据库..."
    
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
        log_warning "PostgreSQL 服务未运行，跳过数据库备份"
        return 0
    fi
    
    # 创建数据库备份
    local db_backup_file="$backup_dir/database.sql"
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U frigate frigate_config > "$db_backup_file"
    
    # 创建压缩备份
    if [ "$COMPRESS_BACKUPS" = true ]; then
        gzip "$db_backup_file"
        log_success "数据库备份完成: ${db_backup_file}.gz"
    else
        log_success "数据库备份完成: $db_backup_file"
    fi
    
    # 备份数据库架构
    local schema_backup_file="$backup_dir/database_schema.sql"
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U frigate -s frigate_config > "$schema_backup_file"
    
    if [ "$COMPRESS_BACKUPS" = true ]; then
        gzip "$schema_backup_file"
    fi
    
    log_success "数据库架构备份完成"
}

# 备份 Redis 数据
backup_redis() {
    local backup_dir=$1
    
    log_info "备份 Redis 数据..."
    
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q redis; then
        log_warning "Redis 服务未运行，跳过 Redis 备份"
        return 0
    fi
    
    # 创建 Redis 备份
    local redis_backup_file="$backup_dir/redis.rdb"
    
    # 触发 Redis 保存
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" BGSAVE
    
    # 等待保存完成
    sleep 5
    
    # 复制 RDB 文件
    docker cp frigate-redis:/data/dump.rdb "$redis_backup_file" 2>/dev/null || {
        log_warning "无法复制 Redis RDB 文件，尝试备份内存数据"
        docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" --rdb "$redis_backup_file"
    }
    
    if [ -f "$redis_backup_file" ]; then
        if [ "$COMPRESS_BACKUPS" = true ]; then
            gzip "$redis_backup_file"
            log_success "Redis 备份完成: ${redis_backup_file}.gz"
        else
            log_success "Redis 备份完成: $redis_backup_file"
        fi
    else
        log_error "Redis 备份失败"
        return 1
    fi
}

# 备份配置文件
backup_configurations() {
    local backup_dir=$1
    
    log_info "备份配置文件..."
    
    local config_dir="$backup_dir/config"
    mkdir -p "$config_dir"
    
    # 备份环境变量文件
    if [ -f ".env.production" ]; then
        cp ".env.production" "$config_dir/"
        log_info "备份 .env.production"
    fi
    
    # 备份 Docker Compose 文件
    if [ -f "docker-compose.prod.yml" ]; then
        cp "docker-compose.prod.yml" "$config_dir/"
        log_info "备份 docker-compose.prod.yml"
    fi
    
    # 备份 Nginx 配置
    if [ -f "nginx.prod.conf" ]; then
        cp "nginx.prod.conf" "$config_dir/"
        log_info "备份 nginx.prod.conf"
    fi
    
    # 备份 SSL 证书
    if [ -d "ssl" ]; then
        cp -r "ssl" "$config_dir/"
        log_info "备份 SSL 证书"
    fi
    
    # 备份自定义配置
    if [ -d "config" ]; then
        cp -r "config" "$config_dir/app-config"
        log_info "备份应用配置"
    fi
    
    log_success "配置文件备份完成"
}

# 备份持久化数据
backup_persistent_data() {
    local backup_dir=$1
    
    log_info "备份持久化数据..."
    
    local data_dir="$backup_dir/data"
    mkdir -p "$data_dir"
    
    # 备份 Grafana 数据
    if [ -d "/opt/frigate-ui/data/grafana" ]; then
        cp -r "/opt/frigate-ui/data/grafana" "$data_dir/"
        log_info "备份 Grafana 数据"
    fi
    
    # 备份 Prometheus 数据
    if [ -d "/opt/frigate-ui/data/prometheus" ]; then
        cp -r "/opt/frigate-ui/data/prometheus" "$data_dir/"
        log_info "备份 Prometheus 数据"
    fi
    
    # 备份 Loki 数据
    if [ -d "/opt/frigate-ui/data/loki" ]; then
        cp -r "/opt/frigate-ui/data/loki" "$data_dir/"
        log_info "备份 Loki 数据"
    fi
    
    # 备份日志文件
    if [ -d "/opt/frigate-ui/logs" ]; then
        cp -r "/opt/frigate-ui/logs" "$data_dir/"
        log_info "备份日志文件"
    fi
    
    log_success "持久化数据备份完成"
}

# 备份 Docker 镜像
backup_docker_images() {
    local backup_dir=$1
    
    log_info "备份 Docker 镜像..."
    
    local images_dir="$backup_dir/images"
    mkdir -p "$images_dir"
    
    # 获取相关镜像列表
    local images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(frigate|nginx|postgres|redis|grafana|prometheus)" | head -10)
    
    # 保存镜像信息
    docker images > "$images_dir/images_list.txt"
    
    # 导出关键镜像
    for image in $images; do
        local image_name=$(echo "$image" | tr '/:' '_')
        local image_file="$images_dir/${image_name}.tar"
        
        log_info "导出镜像: $image"
        docker save "$image" > "$image_file"
        
        if [ "$COMPRESS_BACKUPS" = true ]; then
            gzip "$image_file"
            log_info "镜像已压缩: ${image_file}.gz"
        fi
    done
    
    log_success "Docker 镜像备份完成"
}

# 创建备份清单
create_backup_manifest() {
    local backup_dir=$1
    local backup_type=$2
    
    local manifest_file="$backup_dir/MANIFEST.txt"
    
    cat > "$manifest_file" << EOF
Frigate Configuration UI 备份清单
=====================================

备份类型: $backup_type
备份时间: $(date)
备份目录: $backup_dir
主机名: $(hostname)
用户: $(whoami)

备份内容:
EOF
    
    # 列出备份内容
    find "$backup_dir" -type f -exec ls -lh {} \; >> "$manifest_file"
    
    # 计算总大小
    local total_size=$(du -sh "$backup_dir" | cut -f1)
    echo "" >> "$manifest_file"
    echo "总大小: $total_size" >> "$manifest_file"
    
    log_success "备份清单创建完成: $manifest_file"
}

# 压缩备份目录
compress_backup_dir() {
    local backup_dir=$1
    
    if [ "$COMPRESS_BACKUPS" = true ]; then
        log_info "压缩备份目录..."
        
        local backup_archive="${backup_dir}.tar.gz"
        tar -czf "$backup_archive" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
        
        # 删除原始目录
        rm -rf "$backup_dir"
        
        log_success "备份已压缩: $backup_archive"
        echo "$backup_archive"
    else
        echo "$backup_dir"
    fi
}

# 上传到远程存储
upload_to_remote() {
    local backup_path=$1
    
    if [ "$REMOTE_BACKUP" = true ] && [ -n "$REMOTE_BACKUP_URL" ]; then
        log_info "上传备份到远程存储..."
        
        case "$REMOTE_BACKUP_TYPE" in
            "s3")
                if command -v aws &> /dev/null; then
                    aws s3 cp "$backup_path" "$REMOTE_BACKUP_URL/"
                    log_success "备份已上传到 S3"
                else
                    log_error "AWS CLI 未安装，无法上传到 S3"
                fi
                ;;
            "scp")
                if command -v scp &> /dev/null; then
                    scp "$backup_path" "$REMOTE_BACKUP_URL"
                    log_success "备份已通过 SCP 上传"
                else
                    log_error "SCP 未安装，无法上传"
                fi
                ;;
            "rsync")
                if command -v rsync &> /dev/null; then
                    rsync -avz "$backup_path" "$REMOTE_BACKUP_URL"
                    log_success "备份已通过 Rsync 上传"
                else
                    log_error "Rsync 未安装，无法上传"
                fi
                ;;
            *)
                log_warning "未知的远程备份类型: $REMOTE_BACKUP_TYPE"
                ;;
        esac
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    # 删除超过保留期的备份
    find "$BACKUP_BASE_DIR" -name "*-*" -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    find "$BACKUP_BASE_DIR" -name "*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # 显示剩余备份
    local remaining_backups=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -name "*-*" | wc -l)
    log_success "清理完成，剩余备份: $remaining_backups 个"
}

# 完整备份
full_backup() {
    log_info "开始完整备份..."
    
    local backup_dir=$(create_backup_dir "full")
    
    backup_database "$backup_dir"
    backup_redis "$backup_dir"
    backup_configurations "$backup_dir"
    backup_persistent_data "$backup_dir"
    backup_docker_images "$backup_dir"
    
    create_backup_manifest "$backup_dir" "完整备份"
    
    local final_backup_path=$(compress_backup_dir "$backup_dir")
    upload_to_remote "$final_backup_path"
    
    log_success "完整备份完成: $final_backup_path"
    echo "$final_backup_path"
}

# 数据备份
data_backup() {
    log_info "开始数据备份..."
    
    local backup_dir=$(create_backup_dir "data")
    
    backup_database "$backup_dir"
    backup_redis "$backup_dir"
    backup_persistent_data "$backup_dir"
    
    create_backup_manifest "$backup_dir" "数据备份"
    
    local final_backup_path=$(compress_backup_dir "$backup_dir")
    upload_to_remote "$final_backup_path"
    
    log_success "数据备份完成: $final_backup_path"
    echo "$final_backup_path"
}

# 配置备份
config_backup() {
    log_info "开始配置备份..."
    
    local backup_dir=$(create_backup_dir "config")
    
    backup_configurations "$backup_dir"
    
    create_backup_manifest "$backup_dir" "配置备份"
    
    local final_backup_path=$(compress_backup_dir "$backup_dir")
    upload_to_remote "$final_backup_path"
    
    log_success "配置备份完成: $final_backup_path"
    echo "$final_backup_path"
}

# 列出备份
list_backups() {
    log_info "备份列表:"
    echo
    
    if [ -d "$BACKUP_BASE_DIR" ]; then
        # 列出目录备份
        find "$BACKUP_BASE_DIR" -maxdepth 1 -name "*-*" -type d | sort | while read backup_dir; do
            local backup_name=$(basename "$backup_dir")
            local backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
            local backup_date=$(echo "$backup_name" | grep -o '[0-9]\{8\}-[0-9]\{6\}')
            local formatted_date=$(echo "$backup_date" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)-\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            
            echo "📁 $backup_name ($backup_size) - $formatted_date"
        done
        
        # 列出压缩备份
        find "$BACKUP_BASE_DIR" -maxdepth 1 -name "*.tar.gz" -type f | sort | while read backup_file; do
            local backup_name=$(basename "$backup_file" .tar.gz)
            local backup_size=$(du -sh "$backup_file" 2>/dev/null | cut -f1)
            local backup_date=$(echo "$backup_name" | grep -o '[0-9]\{8\}-[0-9]\{6\}')
            local formatted_date=$(echo "$backup_date" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)-\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            
            echo "📦 $backup_name ($backup_size) - $formatted_date"
        done
    else
        echo "备份目录不存在: $BACKUP_BASE_DIR"
    fi
    
    echo
}

# 恢复备份
restore_backup() {
    local backup_path=$1
    
    if [ -z "$backup_path" ]; then
        log_error "请指定备份路径"
        exit 1
    fi
    
    if [ ! -e "$backup_path" ]; then
        log_error "备份文件不存在: $backup_path"
        exit 1
    fi
    
    log_warning "恢复备份将覆盖现有数据，请确认操作"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "恢复操作已取消"
        exit 0
    fi
    
    log_info "开始恢复备份: $backup_path"
    
    # 停止服务
    log_info "停止服务..."
    docker-compose -f docker-compose.prod.yml down
    
    # 解压备份（如果是压缩文件）
    local restore_dir="/tmp/frigate-restore-$(date +%s)"
    mkdir -p "$restore_dir"
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        tar -xzf "$backup_path" -C "$restore_dir"
        backup_path="$restore_dir/$(ls "$restore_dir" | head -1)"
    fi
    
    # 恢复数据库
    if [ -f "$backup_path/database.sql" ] || [ -f "$backup_path/database.sql.gz" ]; then
        log_info "恢复数据库..."
        
        # 启动数据库服务
        docker-compose -f docker-compose.prod.yml up -d postgres
        sleep 10
        
        # 恢复数据库
        if [ -f "$backup_path/database.sql.gz" ]; then
            gunzip -c "$backup_path/database.sql.gz" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U frigate frigate_config
        else
            docker-compose -f docker-compose.prod.yml exec -T postgres psql -U frigate frigate_config < "$backup_path/database.sql"
        fi
        
        log_success "数据库恢复完成"
    fi
    
    # 恢复 Redis
    if [ -f "$backup_path/redis.rdb" ] || [ -f "$backup_path/redis.rdb.gz" ]; then
        log_info "恢复 Redis 数据..."
        
        # 停止 Redis
        docker-compose -f docker-compose.prod.yml stop redis
        
        # 恢复 RDB 文件
        if [ -f "$backup_path/redis.rdb.gz" ]; then
            gunzip -c "$backup_path/redis.rdb.gz" > /tmp/dump.rdb
        else
            cp "$backup_path/redis.rdb" /tmp/dump.rdb
        fi
        
        docker cp /tmp/dump.rdb frigate-redis:/data/dump.rdb
        rm /tmp/dump.rdb
        
        log_success "Redis 数据恢复完成"
    fi
    
    # 恢复配置文件
    if [ -d "$backup_path/config" ]; then
        log_info "恢复配置文件..."
        
        if [ -f "$backup_path/config/.env.production" ]; then
            cp "$backup_path/config/.env.production" .
        fi
        
        if [ -f "$backup_path/config/docker-compose.prod.yml" ]; then
            cp "$backup_path/config/docker-compose.prod.yml" .
        fi
        
        if [ -f "$backup_path/config/nginx.prod.conf" ]; then
            cp "$backup_path/config/nginx.prod.conf" .
        fi
        
        if [ -d "$backup_path/config/ssl" ]; then
            cp -r "$backup_path/config/ssl" .
        fi
        
        log_success "配置文件恢复完成"
    fi
    
    # 恢复持久化数据
    if [ -d "$backup_path/data" ]; then
        log_info "恢复持久化数据..."
        
        if [ -d "$backup_path/data/grafana" ]; then
            rm -rf /opt/frigate-ui/data/grafana
            cp -r "$backup_path/data/grafana" /opt/frigate-ui/data/
        fi
        
        if [ -d "$backup_path/data/prometheus" ]; then
            rm -rf /opt/frigate-ui/data/prometheus
            cp -r "$backup_path/data/prometheus" /opt/frigate-ui/data/
        fi
        
        if [ -d "$backup_path/data/loki" ]; then
            rm -rf /opt/frigate-ui/data/loki
            cp -r "$backup_path/data/loki" /opt/frigate-ui/data/
        fi
        
        log_success "持久化数据恢复完成"
    fi
    
    # 重启所有服务
    log_info "重启服务..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 清理临时文件
    rm -rf "$restore_dir"
    
    log_success "备份恢复完成！"
}

# 主函数
main() {
    local action=${1:-"full"}
    local backup_path=$2
    
    echo "==================================="
    echo "  Frigate Configuration UI 备份脚本"
    echo "==================================="
    echo
    
    # 加载配置
    load_config
    
    # 创建备份基础目录
    mkdir -p "$BACKUP_BASE_DIR"
    
    case $action in
        "full")
            full_backup
            cleanup_old_backups
            ;;
        "data")
            data_backup
            cleanup_old_backups
            ;;
        "config")
            config_backup
            cleanup_old_backups
            ;;
        "list")
            list_backups
            ;;
        "restore")
            restore_backup "$backup_path"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            log_error "未知的操作: $action"
            show_help
            exit 1
            ;;
    esac
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [操作] [参数]"
    echo
    echo "操作:"
    echo "  full      - 完整备份 (默认)"
    echo "  data      - 仅备份数据 (数据库 + Redis + 持久化数据)"
    echo "  config    - 仅备份配置文件"
    echo "  list      - 列出所有备份"
    echo "  restore   - 恢复备份 (需要指定备份路径)"
    echo "  cleanup   - 清理旧备份"
    echo
    echo "示例:"
    echo "  $0 full                                    # 完整备份"
    echo "  $0 data                                    # 数据备份"
    echo "  $0 list                                    # 列出备份"
    echo "  $0 restore /path/to/backup.tar.gz         # 恢复备份"
    echo "  $0 cleanup                                 # 清理旧备份"
    echo
    echo "配置文件: backup.conf (可选)"
    echo
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"