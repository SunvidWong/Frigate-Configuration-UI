#!/usr/bin/env bash
set -euo pipefail

# 本地部署测试脚本：启动、健康检查、清理
# 用法：
#   bash scripts/local-test.sh up        # 启动本地栈（含数据库）
#   bash scripts/local-test.sh check     # 运行健康检查
#   bash scripts/local-test.sh down      # 停止并清理
#   bash scripts/local-test.sh logs      # 查看关键服务日志
#   bash scripts/local-test.sh reset     # 彻底重置数据卷（慎用）

COMPOSE_FILE="docker-compose.simple.yml"
PROFILE_ARGS="" # simple 栈不需要 profile，避免依赖环

info()  { echo -e "[INFO]  $*"; }
ok()    { echo -e "[OK]    $*"; }
warn()  { echo -e "[WARN]  $*"; }
error() { echo -e "[ERROR] $*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "未找到命令：$1"; exit 1; fi
}

ensure_env() {
  # 本地运行无需敏感密钥；如需外部DB或Redis，请在 .env.local 中配置
  if [[ ! -f .env.local ]]; then
    cat > .env.local <<'EOF'
# 本地部署示例变量（可按需调整）
HTTP_PORT=8000
POSTGRES_PASSWORD=frigate123
EOF
    ok ".env.local 已创建"
  else
    info ".env.local 已存在，跳过创建"
  fi
  # 如缺失关键变量则追加默认值
  grep -q '^HTTP_PORT=' .env.local || echo 'HTTP_PORT=8000' >> .env.local
  grep -q '^POSTGRES_PASSWORD=' .env.local || echo 'POSTGRES_PASSWORD=frigate123' >> .env.local
}

compose() {
  # 仅提取必要变量，避免 .env 中带空格值导致解析错误
  local http_port
  local pg_pass
  http_port=$(grep -E '^HTTP_PORT=' .env.local | tail -n1 | cut -d= -f2- | tr -d '"' || echo '')
  pg_pass=$(grep -E '^POSTGRES_PASSWORD=' .env.local | tail -n1 | cut -d= -f2- | tr -d '"' || echo '')
  [[ -z "$http_port" ]] && http_port=8000
  [[ -z "$pg_pass" ]] && pg_pass=frigate123
  # 优先使用 `docker compose`
  if command -v docker >/dev/null 2>&1; then
    HTTP_PORT="$http_port" POSTGRES_PASSWORD="$pg_pass" docker compose -f "$COMPOSE_FILE" "$@"
  else
    HTTP_PORT="$http_port" POSTGRES_PASSWORD="$pg_pass" docker-compose -f "$COMPOSE_FILE" "$@"
  fi
}

cmd_up() {
  need_cmd docker
  ensure_env
  info "使用 simple Compose 启动本地服务栈..."
  compose up -d
  ok "容器已启动"
  cmd_check
}

cmd_check() {
  info "检查服务状态..."
  compose ps

  # 应用健康检查
  info "检查应用健康接口..."
  if curl -fsS http://localhost:8000/api/health >/dev/null; then
    ok "应用健康检查通过"
  else
    warn "应用健康检查未通过，稍后重试"
    sleep 5
    if curl -fsS http://localhost:8000/api/health >/dev/null; then
      ok "应用健康检查通过(重试)"
    else
      error "应用健康检查失败"
    fi
  fi

  # Postgres 健康检查
  if compose exec postgres pg_isready -U frigate -d frigate_config >/dev/null 2>&1; then
    ok "Postgres 可用"
  else
    warn "Postgres 不可用，请检查环境或日志"
  fi

  # Redis 健康检查
  if compose exec redis redis-cli ping | grep -q PONG; then
    ok "Redis 响应正常"
  else
    warn "Redis 响应异常，请检查日志"
  fi
}

cmd_logs() {
  info "查看关键服务日志（最近100行）..."
  compose logs --tail=100 frigate-config-ui || true
  compose logs --tail=100 postgres || true
  compose logs --tail=100 redis || true
}

cmd_down() {
  info "停止并清理容器（保留数据卷）..."
  compose down
  ok "已停止"
}

cmd_reset() {
  warn "将删除本地数据卷：postgres-data、redis-data（慎用）"
  read -r -p "确认删除数据卷并重置？(y/N) " ans
  if [[ "${ans:-N}" =~ ^[Yy]$ ]]; then
    compose down -v
    ok "数据卷已删除"
  else
    info "已取消"
  fi
}

usage() {
  cat <<'EOF'
用法：bash scripts/local-test.sh <命令>

命令：
  up      启动本地栈并执行健康检查
  check   仅执行健康检查
  logs    查看关键服务日志
  down    停止并清理容器（保留数据卷）
  reset   停止并删除数据卷（慎用）
EOF
}

main() {
  case "${1:-}" in
    up)    cmd_up ;;
    check) cmd_check ;;
    logs)  cmd_logs ;;
    down)  cmd_down ;;
    reset) cmd_reset ;;
    *)     usage; exit 1 ;;
  esac
}

main "$@"