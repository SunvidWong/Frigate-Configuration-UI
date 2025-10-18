#!/bin/bash
set -e

# Frigate Configuration UI - 一键部署脚本
# 用于远程拉取镜像并部署

echo "======================================"
echo " Frigate Configuration UI - 部署脚本"
echo "======================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"
echo ""

# 设置变量
WORK_DIR="${1:-$HOME/frigate-config-ui}"
WEB_PORT="${2:-9888}"
TIMEZONE="${3:-Asia/Shanghai}"

# 镜像标签（可以通过环境变量覆盖）
IMAGE_TAG="${IMAGE_TAG:-001-frigate-webui-deployment}"

echo "📁 工作目录: $WORK_DIR"
echo "🌐 WebUI 端口: $WEB_PORT"
echo "🕐 时区: $TIMEZONE"
echo "🏷️  镜像标签: $IMAGE_TAG"
echo ""

# 创建工作目录
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "📝 创建 docker-compose.yml..."

# 创建 docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  frigate-config-backend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui:${IMAGE_TAG}
    container_name: frigate-config-backend
    network_mode: "host"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data
    environment:
      - WEB_PORT=${WEB_PORT}
      - TZ=${TIMEZONE}
    restart: unless-stopped

  frigate-config-frontend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui-frontend:${IMAGE_TAG}
    container_name: frigate-config-frontend
    network_mode: "host"
    depends_on:
      - frigate-config-backend
    restart: unless-stopped
EOF

echo "✅ docker-compose.yml 已创建"
echo ""

# 停止旧容器（如果存在）
if docker ps -a | grep -q frigate-config; then
    echo "🔄 停止并移除旧容器..."
    docker-compose down
    echo "✅ 旧容器已移除"
    echo ""
fi

# 拉取镜像
echo "📦 拉取 Docker 镜像..."
echo "   后端: ghcr.io/sunvidwong/frigate-configuration-ui:${IMAGE_TAG}"
echo "   前端: ghcr.io/sunvidwong/frigate-configuration-ui-frontend:${IMAGE_TAG}"
echo ""

if ! docker-compose pull; then
    echo ""
    echo "❌ 镜像拉取失败！"
    echo ""
    echo "可能的原因："
    echo "1. 镜像尚未发布或标签不存在"
    echo "2. 镜像是私有的，需要登录"
    echo ""
    echo "解决方法："
    echo "1. 检查镜像是否存在："
    echo "   docker manifest inspect ghcr.io/sunvidwong/frigate-configuration-ui:${IMAGE_TAG}"
    echo ""
    echo "2. 如果需要登录 GHCR："
    echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u sunvidwong --password-stdin"
    echo ""
    echo "3. 确保仓库的 Packages 设置为 Public"
    echo ""
    exit 1
fi

echo "✅ 镜像拉取成功"
echo ""

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "======================================"
echo " 访问信息"
echo "======================================"
echo ""

# 获取宿主机 IP
HOST_IP=$(hostname -I | awk '{print $1}')

echo "🌐 WebUI 地址:"
echo "   http://localhost:${WEB_PORT}"
echo "   http://${HOST_IP}:${WEB_PORT}"
echo ""

echo "📊 查看日志:"
echo "   docker-compose logs -f"
echo ""

echo "🔄 管理命令:"
echo "   启动: docker-compose start"
echo "   停止: docker-compose stop"
echo "   重启: docker-compose restart"
echo "   移除: docker-compose down"
echo ""

echo "📂 数据目录: $WORK_DIR/data"
echo ""

# 显示容器状态
echo "📋 容器状态:"
docker-compose ps
echo ""

echo "======================================"
echo " 部署成功！🎉"
echo "======================================"
