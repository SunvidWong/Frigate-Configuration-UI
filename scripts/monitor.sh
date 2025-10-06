#!/bin/bash

# ================================
# Frigate Configuration UI 监控脚本
# ================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

# 获取当前时间戳
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# 检查服务状态
check_service_status() {
    log_info "检查服务状态..."
    echo
    
    local services=$(docker-compose -f docker-compose.prod.yml ps --services 2>/dev/null || echo "")
    
    if [ -z "$services" ]; then
        log_error "无法获取服务列表，请检查 docker-compose.prod.yml 文件"
        return 1
    fi
    
    local all_healthy=true
    
    for service in $services; do
        local status=$(docker-compose -f docker-compose.prod.yml ps "$service" 2>/dev/null | tail -n +2)
        
        if echo "$status" | grep -q "Up"; then
            if echo "$status" | grep -q "healthy"; then
                echo -e "✅ ${GREEN}$service${NC} - 运行中 (健康)"
            else
                echo -e "⚠️  ${YELLOW}$service${NC} - 运行中 (未知健康状态)"
            fi
        else
            echo -e "❌ ${RED}$service${NC} - 停止或异常"
            all_healthy=false
        fi
    done
    
    echo
    if [ "$all_healthy" = true ]; then
        log_success "所有服务运行正常"
    else
        log_warning "部分服务存在问题"
    fi
    
    return 0
}

# 检查容器资源使用情况
check_container_resources() {
    log_info "检查容器资源使用情况..."
    echo
    
    # 获取容器统计信息
    local stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null)
    
    if [ -n "$stats" ]; then
        echo "$stats" | head -1  # 显示表头
        echo "$stats" | tail -n +2 | grep -E "(frigate|nginx|postgres|redis|grafana|prometheus)" | while read line; do
            local container=$(echo "$line" | awk '{print $1}')
            local cpu=$(echo "$line" | awk '{print $2}')
            local mem_usage=$(echo "$line" | awk '{print $3}')
            local mem_perc=$(echo "$line" | awk '{print $4}')
            
            # 检查 CPU 使用率
            local cpu_num=$(echo "$cpu" | sed 's/%//')
            if (( $(echo "$cpu_num > 80" | bc -l) )); then
                echo -e "${RED}$line${NC}"
            elif (( $(echo "$cpu_num > 50" | bc -l) )); then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        log_warning "无法获取容器统计信息"
    fi
    
    echo
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."
    echo
    
    # CPU 使用率
    local cpu_usage=$(top -l 1 -s 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "0")
    log_metric "CPU 使用率: ${cpu_usage}%"
    
    # 内存使用情况
    if command -v free &> /dev/null; then
        local mem_info=$(free -h | grep "Mem:")
        local mem_total=$(echo "$mem_info" | awk '{print $2}')
        local mem_used=$(echo "$mem_info" | awk '{print $3}')
        local mem_available=$(echo "$mem_info" | awk '{print $7}')
        log_metric "内存使用: $mem_used / $mem_total (可用: $mem_available)"
    else
        # macOS 系统
        local mem_pressure=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print $5}' | sed 's/%//' || echo "unknown")
        log_metric "系统内存压力: $mem_pressure"
    fi
    
    # 磁盘使用情况
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    local disk_available=$(df -h . | tail -1 | awk '{print $4}')
    log_metric "磁盘使用率: ${disk_usage}% (可用: $disk_available)"
    
    # 负载平均值
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | xargs)
    log_metric "负载平均值: $load_avg"
    
    echo
    
    # 资源警告
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warning "CPU 使用率过高: ${cpu_usage}%"
    fi
    
    if (( disk_usage > 85 )); then
        log_warning "磁盘使用率过高: ${disk_usage}%"
    fi
}

# 检查网络连接
check_network_connectivity() {
    log_info "检查网络连接..."
    echo
    
    # 检查主应用端口
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        log_success "主应用健康检查通过 (http://localhost/health)"
    else
        log_error "主应用健康检查失败"
    fi
    
    # 检查 HTTPS
    if curl -f -s -k https://localhost/health > /dev/null 2>&1; then
        log_success "HTTPS 连接正常"
    else
        log_warning "HTTPS 连接失败"
    fi
    
    # 检查数据库连接
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U frigate > /dev/null 2>&1; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败"
    fi
    
    # 检查 Redis 连接
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning ping > /dev/null 2>&1; then
        log_success "Redis 连接正常"
    else
        log_error "Redis 连接失败"
    fi
    
    echo
}

# 检查日志错误
check_logs_for_errors() {
    log_info "检查最近的错误日志..."
    echo
    
    local services=$(docker-compose -f docker-compose.prod.yml ps --services 2>/dev/null)
    local error_count=0
    
    for service in $services; do
        local errors=$(docker-compose -f docker-compose.prod.yml logs --tail=100 "$service" 2>/dev/null | grep -i -E "(error|exception|failed|fatal)" | wc -l)
        
        if [ "$errors" -gt 0 ]; then
            log_warning "$service: 发现 $errors 个错误日志"
            error_count=$((error_count + errors))
            
            # 显示最近的几个错误
            echo "最近的错误:"
            docker-compose -f docker-compose.prod.yml logs --tail=10 "$service" 2>/dev/null | grep -i -E "(error|exception|failed|fatal)" | tail -3 | while read line; do
                echo "  $line"
            done
            echo
        fi
    done
    
    if [ "$error_count" -eq 0 ]; then
        log_success "未发现错误日志"
    else
        log_warning "总共发现 $error_count 个错误日志"
    fi
    
    echo
}

# 检查数据库状态
check_database_status() {
    log_info "检查数据库状态..."
    echo
    
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
        log_warning "PostgreSQL 服务未运行"
        return 1
    fi
    
    # 数据库连接数
    local connections=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U frigate -d frigate_config -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | grep -E "^\s*[0-9]+\s*$" | xargs || echo "0")
    log_metric "数据库连接数: $connections"
    
    # 数据库大小
    local db_size=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U frigate -d frigate_config -c "SELECT pg_size_pretty(pg_database_size('frigate_config'));" 2>/dev/null | grep -E "^\s*[0-9]+" | xargs || echo "unknown")
    log_metric "数据库大小: $db_size"
    
    # 检查长时间运行的查询
    local long_queries=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U frigate -d frigate_config -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 minute';" 2>/dev/null | grep -E "^\s*[0-9]+\s*$" | xargs || echo "0")
    
    if [ "$long_queries" -gt 0 ]; then
        log_warning "发现 $long_queries 个长时间运行的查询"
    else
        log_success "没有长时间运行的查询"
    fi
    
    echo
}

# 检查 Redis 状态
check_redis_status() {
    log_info "检查 Redis 状态..."
    echo
    
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q redis; then
        log_warning "Redis 服务未运行"
        return 1
    fi
    
    # Redis 信息
    local redis_info=$(docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning info memory 2>/dev/null)
    
    if [ -n "$redis_info" ]; then
        local used_memory=$(echo "$redis_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        local used_memory_peak=$(echo "$redis_info" | grep "used_memory_peak_human:" | cut -d: -f2 | tr -d '\r')
        
        log_metric "Redis 内存使用: $used_memory (峰值: $used_memory_peak)"
    fi
    
    # 连接数
    local connected_clients=$(docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --no-auth-warning info clients 2>/dev/null | grep "connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "0")
    log_metric "Redis 连接数: $connected_clients"
    
    echo
}

# 性能测试
run_performance_test() {
    log_info "运行性能测试..."
    echo
    
    # API 响应时间测试
    local api_endpoints=(
        "/health"
        "/api/system/info"
        "/api/cameras"
    )
    
    for endpoint in "${api_endpoints[@]}"; do
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost$endpoint" 2>/dev/null || echo "timeout")
        
        if [ "$response_time" != "timeout" ]; then
            local response_ms=$(echo "$response_time * 1000" | bc)
            log_metric "$endpoint 响应时间: ${response_ms}ms"
            
            if (( $(echo "$response_time > 2" | bc -l) )); then
                log_warning "$endpoint 响应时间过长"
            fi
        else
            log_error "$endpoint 请求超时"
        fi
    done
    
    echo
}

# 生成监控报告
generate_report() {
    local report_file="/opt/frigate-ui/logs/monitor-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log_info "生成监控报告: $report_file"
    
    {
        echo "Frigate Configuration UI 监控报告"
        echo "=================================="
        echo "生成时间: $(get_timestamp)"
        echo "主机名: $(hostname)"
        echo
        
        echo "服务状态:"
        echo "--------"
        check_service_status 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
        echo "系统资源:"
        echo "--------"
        check_system_resources 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
        echo "网络连接:"
        echo "--------"
        check_network_connectivity 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
        echo "数据库状态:"
        echo "----------"
        check_database_status 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
        echo "Redis 状态:"
        echo "----------"
        check_redis_status 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
        echo "性能测试:"
        echo "--------"
        run_performance_test 2>&1 | sed 's/\x1b\[[0-9;]*m//g'
        echo
        
    } > "$report_file"
    
    log_success "监控报告已保存: $report_file"
}

# 实时监控
real_time_monitor() {
    log_info "启动实时监控 (按 Ctrl+C 退出)..."
    echo
    
    while true; do
        clear
        echo "==================================="
        echo "  Frigate Configuration UI 实时监控"
        echo "  $(get_timestamp)"
        echo "==================================="
        echo
        
        check_service_status
        check_system_resources
        check_container_resources
        
        echo "下次更新: $(date -d '+30 seconds' '+%H:%M:%S')"
        sleep 30
    done
}

# 发送告警
send_alert() {
    local message=$1
    local severity=${2:-"warning"}
    
    log_warning "告警: $message"
    
    # 这里可以集成各种告警方式
    # 例如：邮件、Slack、钉钉、企业微信等
    
    # 记录告警日志
    local alert_log="/opt/frigate-ui/logs/alerts.log"
    echo "$(get_timestamp) [$severity] $message" >> "$alert_log"
    
    # 如果配置了邮件告警
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Frigate UI Alert [$severity]" "$ALERT_EMAIL"
    fi
    
    # 如果配置了 Webhook
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"$message\",\"severity\":\"$severity\"}" \
             2>/dev/null || true
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    echo
    
    local issues=0
    
    # 检查服务状态
    local services=$(docker-compose -f docker-compose.prod.yml ps --services 2>/dev/null)
    for service in $services; do
        if ! docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up"; then
            send_alert "服务 $service 未运行" "critical"
            issues=$((issues + 1))
        fi
    done
    
    # 检查磁盘空间
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if (( disk_usage > 90 )); then
        send_alert "磁盘使用率过高: ${disk_usage}%" "critical"
        issues=$((issues + 1))
    elif (( disk_usage > 80 )); then
        send_alert "磁盘使用率警告: ${disk_usage}%" "warning"
    fi
    
    # 检查内存使用
    if command -v free &> /dev/null; then
        local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
        if (( mem_usage > 90 )); then
            send_alert "内存使用率过高: ${mem_usage}%" "critical"
            issues=$((issues + 1))
        fi
    fi
    
    # 检查 API 可用性
    if ! curl -f -s http://localhost/health > /dev/null 2>&1; then
        send_alert "API 健康检查失败" "critical"
        issues=$((issues + 1))
    fi
    
    if [ "$issues" -eq 0 ]; then
        log_success "健康检查通过"
    else
        log_error "发现 $issues 个问题"
    fi
    
    return $issues
}

# 主函数
main() {
    local action=${1:-"status"}
    
    echo "==================================="
    echo "  Frigate Configuration UI 监控脚本"
    echo "==================================="
    echo
    
    case $action in
        "status")
            check_service_status
            check_system_resources
            check_network_connectivity
            ;;
        "full")
            check_service_status
            check_system_resources
            check_container_resources
            check_network_connectivity
            check_database_status
            check_redis_status
            check_logs_for_errors
            run_performance_test
            ;;
        "health")
            health_check
            ;;
        "report")
            generate_report
            ;;
        "watch")
            real_time_monitor
            ;;
        "resources")
            check_system_resources
            check_container_resources
            ;;
        "logs")
            check_logs_for_errors
            ;;
        "performance")
            run_performance_test
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
    echo "用法: $0 [操作]"
    echo
    echo "操作:"
    echo "  status      - 基础状态检查 (默认)"
    echo "  full        - 完整监控检查"
    echo "  health      - 健康检查 (带告警)"
    echo "  report      - 生成监控报告"
    echo "  watch       - 实时监控"
    echo "  resources   - 资源使用情况"
    echo "  logs        - 检查错误日志"
    echo "  performance - 性能测试"
    echo
    echo "示例:"
    echo "  $0 status      # 基础状态检查"
    echo "  $0 full        # 完整监控"
    echo "  $0 watch       # 实时监控"
    echo "  $0 health      # 健康检查"
    echo
    echo "环境变量:"
    echo "  ALERT_EMAIL    - 告警邮箱地址"
    echo "  ALERT_WEBHOOK  - 告警 Webhook URL"
    echo
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"