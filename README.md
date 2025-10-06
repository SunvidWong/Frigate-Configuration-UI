# 🎥 Frigate Configuration UI

一个现代化的、响应式的Frigate视频监控系统配置管理界面。提供直观的用户界面来管理摄像头、硬件加速器、AI模型和系统配置。

![Frigate Configuration UI](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/node.js-18%2B-lightgrey.svg)
![React](https://img.shields.io/badge/react-19+-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5+-blue.svg)

## ✨ 特性

### 🎯 核心功能
- **摄像头管理** - 添加、配置、测试和监控网络摄像头
- **硬件加速** - 自动检测和管理GPU、TPU等硬件加速器
- **AI模型管理** - 下载、安装和配置AI检测模型
- **实时监控** - WebSocket实时数据同步和状态更新
- **系统配置** - 完整的Frigate系统参数配置
- **日志管理** - 系统日志查看、搜索和导出
- **远程访问** - DDNS配置和SSL证书管理

### 🛠️ 技术特性
- **响应式设计** - 完美适配桌面和移动设备
- **实时更新** - WebSocket实时数据同步
- **类型安全** - 完整的TypeScript类型定义
- **模块化架构** - 清晰的代码结构，易于维护和扩展
- **现代化UI** - 基于Tailwind CSS的美观界面
- **错误处理** - 完善的错误处理和用户反馈

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 安装和运行

```bash
# 克隆仓库
git clone https://github.com/SunvidWong/Frigate-Configuration-UI.git
cd Frigate-Configuration-UI

# 安装依赖
npm install
npm run install-server  # 安装后端依赖

# 启动开发环境
npm run dev-full  # 同时启动前后端

# 或者分别启动
npm run server-dev  # 终端1: 启动后端服务
npm run dev          # 终端2: 启动前端开发服务器
```

### 访问应用
- 🌐 **前端界面**: http://localhost:5173
- 📡 **后端API**: http://localhost:8000
- 🔌 **WebSocket**: ws://localhost:8000

## 📖 使用指南

### 摄像头管理
1. 点击"摄像头管理"进入摄像头配置页面
2. 使用"发现摄像头"自动扫描网络中的摄像头
3. 手动添加摄像头或编辑现有配置
4. 测试摄像头连接确保配置正确
5. 实时监控摄像头状态

### 硬件加速器
1. 访问"硬件加速器"页面
2. 系统会自动检测可用的硬件加速设备
3. 查看设备状态和驱动安装情况
4. 配置硬件加速参数
5. 监控硬件使用情况和性能

### AI模型管理
1. 在"模型管理"页面浏览可用的AI模型
2. 下载并安装适合的检测模型
3. 配置模型参数和推理设置
4. 运行性能基准测试
5. 监控模型推理性能

### 系统配置
1. 使用"系统设置"页面配置全局参数
2. 配置数据库和存储选项
3. 设置通知和警报规则
4. 管理安全选项
5. 导出/导入配置文件

## 🏗️ 项目结构

```
frigate-configuration-ui/
├── src/                          # 前端源代码
│   ├── components/               # React组件
│   │   ├── common/              # 通用组件
│   │   ├── camera/              # 摄像头相关组件
│   │   └── hardware/            # 硬件相关组件
│   ├── hooks/                   # React Hooks
│   │   ├── useCamera.ts         # 摄像头管理
│   │   ├── useHardware.ts       # 硬件管理
│   │   ├── useModel.ts          # 模型管理
│   │   └── ...
│   ├── pages/                   # 页面组件
│   │   ├── Dashboard.tsx        # 仪表板
│   │   ├── CameraManagement.tsx # 摄像头管理
│   │   └── ...
│   ├── services/                # 服务层
│   │   ├── api.ts               # REST API客户端
│   │   └── websocket.ts         # WebSocket客户端
│   ├── types/                   # TypeScript类型定义
│   └── utils/                   # 工具函数
├── public/                      # 静态资源
├── server.js                    # 后端服务器
├── package.json                 # 项目配置
└── README.md                    # 项目说明
```

## 🔧 开发

### 开发环境设置

```bash
# 安装开发依赖
npm install

# 启动开发服务器
npm run dev

# 运行类型检查
npm run type-check

# 代码格式化
npm run format

# 代码检查
npm run lint

# 构建生产版本
npm run build
```

### 环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```env
# API配置
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_HOST=localhost:8000

# 应用配置
VITE_APP_TITLE=Frigate Configuration UI
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_DEBUG=true

# 安全配置
VITE_ENABLE_HTTPS=false
```

### API文档

主要API端点：

#### 摄像头管理
- `GET /api/cameras` - 获取摄像头列表
- `POST /api/cameras` - 创建摄像头
- `PUT /api/cameras/:id` - 更新摄像头
- `DELETE /api/cameras/:id` - 删除摄像头
- `POST /api/cameras/discover` - 发现摄像头
- `POST /api/cameras/:id/test` - 测试连接

#### 硬件管理
- `GET /api/hardware/accelerators` - 获取硬件列表
- `POST /api/hardware/detect` - 检测硬件

#### 系统信息
- `GET /api/system/info` - 获取系统信息
- `GET /api/system/status` - 获取服务状态

### WebSocket事件

连接地址: `ws://localhost:8000`

支持的事件类型：
- `system_status_update` - 系统状态更新
- `camera_status_change` - 摄像头状态变化
- `hardware_accelerator_status` - 硬件状态
- `model_download_progress` - 模型下载进度
- `deployment_status_update` - 部署状态更新

## 🐳 Docker部署

### 🌐 远程部署（云服务器）

#### 🚀 一键部署脚本

适用于 Ubuntu/Debian/CentOS 等 Linux 云服务器：

```bash
# 下载并运行一键部署脚本
curl -fsSL https://raw.githubusercontent.com/SunvidWong/Frigate-Configuration-UI/main/scripts/deploy.sh | bash

# 或者手动下载后执行
wget https://raw.githubusercontent.com/SunvidWong/Frigate-Configuration-UI/main/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

#### 📋 系统要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| **CPU** | 1核心 | 2核心+ |
| **内存** | 1GB | 2GB+ |
| **存储** | 10GB | 20GB+ |
| **系统** | Ubuntu 18.04+ | Ubuntu 22.04 LTS |
| **网络** | 1Mbps | 10Mbps+ |

#### 🔧 手动部署步骤

**1. 准备服务器环境**
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git unzip

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用 Docker 组权限
newgrp docker
```

**2. 部署应用**
```bash
# 克隆项目
git clone https://github.com/SunvidWong/Frigate-Configuration-UI.git
cd Frigate-Configuration-UI

# 复制生产环境配置
cp .env.production .env

# 编辑环境变量（重要！）
nano .env
# 修改以下关键配置：
# - DOMAIN=your-domain.com
# - POSTGRES_PASSWORD=your-secure-password
# - REDIS_PASSWORD=your-secure-password
# - JWT_SECRET=your-jwt-secret

# 启动生产环境服务
docker-compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps
```

**3. 配置域名和SSL（推荐）**
```bash
# 如果有域名，配置 SSL 证书
# 方式1：使用 Let's Encrypt（免费）
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 将证书复制到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem

# 重启 Nginx 以应用 SSL
docker-compose -f docker-compose.prod.yml restart nginx
```

**4. 配置防火墙**
```bash
# Ubuntu/Debian 使用 ufw
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# CentOS/RHEL 使用 firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 🌍 云平台快速部署

**阿里云 ECS**
```bash
# 使用阿里云镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://your-mirror.aliyuncs.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker

# 然后执行标准部署流程
```

**腾讯云 CVM**
```bash
# 使用腾讯云镜像加速
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

**AWS EC2**
```bash
# Amazon Linux 2 安装 Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 📊 部署验证

部署完成后，通过以下方式验证：

```bash
# 检查所有服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 测试 API 连接
curl -I http://your-server-ip/api/health

# 测试 WebSocket 连接
curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://your-server-ip/ws
```

#### 🔄 自动化运维

**设置自动更新**
```bash
# 创建更新脚本
cat > update.sh << 'EOF'
#!/bin/bash
cd /path/to/Frigate-Configuration-UI
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
docker image prune -f
EOF

chmod +x update.sh

# 设置定时任务（每周日凌晨2点更新）
crontab -e
# 添加：0 2 * * 0 /path/to/update.sh >> /var/log/frigate-update.log 2>&1
```

**设置自动备份**
```bash
# 使用项目提供的备份脚本
./scripts/backup.sh

# 设置定时备份（每天凌晨3点）
crontab -e
# 添加：0 3 * * * /path/to/Frigate-Configuration-UI/scripts/backup.sh >> /var/log/frigate-backup.log 2>&1
```

### 🚀 本地快速部署

#### 方式1：使用Docker Compose（推荐）

```bash
# 克隆仓库
git clone https://github.com/SunvidWong/Frigate-Configuration-UI.git
cd Frigate-Configuration-UI

# 复制环境变量配置
cp .env.docker .env

# 启动基础服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f frigate-config-ui
```

#### 方式2：启用完整服务栈（包含数据库和监控）

```bash
# 启动所有服务（包含数据库、监控）
docker-compose --profile database --profile monitoring up -d

# 查看所有服务
docker-compose ps
```

#### 方式3：远程镜像部署（推荐生产环境）

使用预构建的远程镜像，支持自动拉取和更新：

```bash
# 使用远程部署配置
cp .env.remote .env

# 编辑环境变量（必须设置密码）
nano .env
# 重要配置项：
# - DOMAIN=your-domain.com
# - POSTGRES_PASSWORD=your-secure-password
# - REDIS_PASSWORD=your-secure-password
# - JWT_SECRET=your-jwt-secret

# 使用远程镜像启动服务
docker-compose -f docker-compose.remote.yml up -d

# 启用自动更新（可选）
docker-compose -f docker-compose.remote.yml --profile auto-update up -d

# 启用健康监控（可选）
docker-compose -f docker-compose.remote.yml --profile monitoring up -d
```

**一键部署脚本：**
```bash
# 使用提供的部署脚本
chmod +x deploy-remote.sh
./deploy-remote.sh

# 或者使用特定命令
./deploy-remote.sh pull    # 仅拉取最新镜像
./deploy-remote.sh update  # 更新并重启服务
./deploy-remote.sh status  # 查看服务状态
```

#### 方式4：单独使用Docker

```bash
# 使用远程镜像（推荐）
docker pull sunvidwong/frigate-config-ui:latest

# 运行容器
docker run -d \
  --name frigate-config-ui \
  -p 8000:8000 \
  -e NODE_ENV=production \
  -e PORT=8000 \
  -v $(pwd)/config:/app/config \
  --restart unless-stopped \
  frigate-config-ui
```

### 📁 服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │  Frigate UI     │    │     Redis       │
│   (反向代理)     │───▶│   (主应用)       │───▶│   (缓存)         │
│   :80, :443     │    │   :8000         │    │   :6379         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (数据库)       │
                       │   :5432         │
                       └─────────────────┘
```

### 🔧 环境配置

#### 必需配置文件

1. **环境变量文件 (`.env`)**
```bash
# 远程镜像部署（推荐）
cp .env.remote .env

# 生产环境
cp .env.production .env

# 编辑配置
nano .env
```

2. **SSL证书（可选）**
```bash
# 创建SSL目录
mkdir -p ssl

# 放置证书文件
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

#### 主要配置项

**基础配置：**
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DOMAIN` | `localhost` | 域名配置 |
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `8000` | 应用端口 |
| `HTTPS_ENABLED` | `false` | 是否启用HTTPS |

**数据库配置：**
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `POSTGRES_PASSWORD` | `frigate123` | PostgreSQL数据库密码 |
| `REDIS_PASSWORD` | `frigate123` | Redis缓存密码 |

**安全配置：**
| 配置项 | 说明 |
|--------|------|
| `JWT_SECRET` | JWT令牌密钥（32位随机字符串） |
| `SESSION_SECRET` | 会话密钥（32位随机字符串） |
| `ENCRYPTION_KEY` | 加密密钥（32位随机字符串） |

**远程镜像配置：**
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DOCKER_REGISTRY` | - | Docker镜像仓库地址 |
| `IMAGE_TAG` | `latest` | 主应用镜像标签 |
| `UPDATE_INTERVAL` | `3600` | 自动更新检查间隔（秒） |
| `WATCHTOWER_SCHEDULE` | `0 2 * * *` | 定时更新计划（Cron格式） |

### 🌐 访问地址

部署完成后，您可以通过以下地址访问各个服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| **主应用** | http://localhost | 通过Nginx代理访问 |
| **API接口** | http://localhost/api | RESTful API |
| **WebSocket** | ws://localhost/ws | 实时数据连接 |
| **Redis** | localhost:6379 | 缓存服务 |
| **PostgreSQL** | localhost:5432 | 数据库服务 |
| **Grafana** | http://localhost:3000 | 监控面板 |
| **Prometheus** | http://localhost:9090 | 指标收集 |

### 📊 监控和管理

#### 查看服务状态
```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f frigate-config-ui
docker-compose logs -f nginx
docker-compose logs -f redis
```

#### 服务管理
```bash
# 重启服务
docker-compose restart frigate-config-ui

# 停止所有服务
docker-compose down

# 完全清理（包括数据卷）
docker-compose down -v
```

#### 数据备份
```bash
# 备份数据库
docker-compose exec postgres pg_dump -U frigate frigate_config > backup.sql

# 备份Redis数据
docker-compose exec redis redis-cli BGSAVE
```

### 🔒 安全配置

#### 启用HTTPS（可选）
1. 将SSL证书放置在 `ssl/` 目录
2. 修改 `nginx.conf` 启用HTTPS配置
3. 更新环境变量 `VITE_ENABLE_HTTPS=true`
4. 重启Nginx服务

#### 防火墙设置
```bash
# 开放必要端口
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8000/tcp  # 应用直连（可选）
```

### 🐛 故障排除

#### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   # 修改docker-compose.yml中的端口映射
   ```

2. **权限问题**
   ```bash
   # 修复目录权限
   sudo chown -R 1001:1001 config logs data
   ```

3. **服务无法启动**
   ```bash
   # 查看详细日志
   docker-compose logs service-name
   # 检查资源使用
   docker stats
   ```

4. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose exec postgres pg_isready
   # 重启数据库服务
   docker-compose restart postgres
   ```

### 🚀 Docker Hub 镜像

#### 使用预构建镜像

```bash
# 拉取最新镜像
docker pull sunvidwong/frigate-config-ui:latest

# 直接运行
docker run -d \
  --name frigate-config-ui \
  -p 8000:8000 \
  -e NODE_ENV=production \
  sunvidwong/frigate-config-ui:latest
```

#### 使用 docker-compose.remote.yml

推荐使用专门的远程部署配置文件：

```bash
# 使用远程镜像配置
docker-compose -f docker-compose.remote.yml up -d

# 启用自动更新
docker-compose -f docker-compose.remote.yml --profile auto-update up -d

# 启用健康监控
docker-compose -f docker-compose.remote.yml --profile monitoring up -d
```

**特性：**
- ✅ 自动拉取最新镜像 (`pull_policy: always`)
- ✅ 集成 Watchtower 自动更新
- ✅ 内置健康检查和监控
- ✅ 完整的服务栈（应用、数据库、缓存、代理）
- ✅ 生产级配置和安全设置

#### 多架构支持

支持以下架构：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64)
- `linux/arm/v7` (ARM32)

```bash
# 指定架构拉取
docker pull --platform linux/arm64 sunvidwong/frigate-config-ui:latest
```

### 🔧 高级配置

#### 环境变量详解

**基础配置**
```bash
# 应用基础配置
NODE_ENV=production                    # 运行环境：development/production
PORT=8000                             # 应用端口
DOMAIN=your-domain.com                # 域名（用于SSL和CORS）
APP_NAME="Frigate Configuration UI"   # 应用名称
```

**数据库配置**
```bash
# PostgreSQL 配置
POSTGRES_HOST=postgres                # 数据库主机
POSTGRES_PORT=5432                   # 数据库端口
POSTGRES_DB=frigate_config           # 数据库名
POSTGRES_USER=frigate                # 数据库用户
POSTGRES_PASSWORD=your-secure-password # 数据库密码

# Redis 配置
REDIS_HOST=redis                     # Redis主机
REDIS_PORT=6379                      # Redis端口
REDIS_PASSWORD=your-redis-password   # Redis密码
REDIS_DB=0                          # Redis数据库编号
```

**安全配置**
```bash
# JWT 和会话配置
JWT_SECRET=your-jwt-secret-key       # JWT密钥（至少32字符）
SESSION_SECRET=your-session-secret   # 会话密钥
ENCRYPTION_KEY=your-encryption-key   # 数据加密密钥
API_KEY=your-api-key                # API访问密钥

# SSL/TLS 配置
SSL_CERT_PATH=/app/ssl/cert.pem     # SSL证书路径
SSL_KEY_PATH=/app/ssl/key.pem       # SSL私钥路径
ENABLE_HTTPS=true                   # 启用HTTPS
```

**监控配置**
```bash
# Grafana 配置
GRAFANA_ADMIN_PASSWORD=admin123      # Grafana管理员密码
GRAFANA_SECRET_KEY=grafana-secret    # Grafana密钥

# Prometheus 配置
PROMETHEUS_RETENTION_TIME=15d        # 数据保留时间
PROMETHEUS_STORAGE_PATH=/prometheus  # 数据存储路径
```

#### 性能调优

**Docker 资源限制**
```yaml
# 在 docker-compose.prod.yml 中调整
services:
  frigate-config-ui:
    deploy:
      resources:
        limits:
          cpus: '2.0'      # CPU限制
          memory: 2G       # 内存限制
        reservations:
          cpus: '0.5'      # CPU预留
          memory: 512M     # 内存预留
```

**Nginx 优化**
```nginx
# 在 nginx.prod.conf 中调整
worker_processes auto;               # 工作进程数
worker_connections 1024;            # 每个进程连接数
client_max_body_size 100M;          # 最大请求体大小
keepalive_timeout 65;               # 连接保持时间
```

**数据库优化**
```bash
# PostgreSQL 配置调优
POSTGRES_SHARED_BUFFERS=256MB        # 共享缓冲区
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB    # 有效缓存大小
POSTGRES_WORK_MEM=4MB               # 工作内存
POSTGRES_MAINTENANCE_WORK_MEM=64MB   # 维护工作内存
```

### 🔍 故障排除指南

#### 常见问题诊断

**1. 服务启动失败**
```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看启动日志
docker-compose -f docker-compose.prod.yml logs frigate-config-ui

# 检查端口占用
sudo netstat -tulpn | grep :8000
sudo lsof -i :8000

# 解决方案：
# - 修改端口映射
# - 停止占用端口的进程
# - 检查防火墙设置
```

**2. 数据库连接问题**
```bash
# 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U frigate

# 检查数据库日志
docker-compose -f docker-compose.prod.yml logs postgres

# 手动连接测试
docker-compose -f docker-compose.prod.yml exec postgres psql -U frigate -d frigate_config

# 解决方案：
# - 检查数据库密码
# - 确认数据库服务正常运行
# - 检查网络连接
```

**3. Redis 连接问题**
```bash
# 测试 Redis 连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 检查 Redis 日志
docker-compose -f docker-compose.prod.yml logs redis

# 测试认证
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a your-password ping

# 解决方案：
# - 检查 Redis 密码配置
# - 确认 Redis 服务状态
# - 检查内存使用情况
```

**4. SSL/HTTPS 问题**
```bash
# 检查证书文件
ls -la ssl/
openssl x509 -in ssl/cert.pem -text -noout

# 测试 SSL 连接
openssl s_client -connect your-domain.com:443

# 检查 Nginx 配置
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# 解决方案：
# - 确认证书文件路径正确
# - 检查证书有效期
# - 验证域名匹配
# - 重新生成证书
```

**5. 性能问题**
```bash
# 检查系统资源
docker stats
free -h
df -h

# 检查应用性能
curl -w "@curl-format.txt" -o /dev/null -s http://your-domain.com/api/health

# 检查数据库性能
docker-compose -f docker-compose.prod.yml exec postgres psql -U frigate -d frigate_config -c "SELECT * FROM pg_stat_activity;"

# 解决方案：
# - 增加服务器资源
# - 优化数据库查询
# - 启用缓存
# - 调整连接池大小
```

**6. 远程部署问题**
```bash
# 检查远程镜像拉取
docker-compose -f docker-compose.remote.yml pull

# 检查 Watchtower 自动更新状态
docker-compose -f docker-compose.remote.yml logs watchtower

# 检查健康监控服务
docker-compose -f docker-compose.remote.yml logs healthcheck

# 测试镜像可用性
docker run --rm sunvidwong/frigate-config-ui:latest --version

# 解决方案：
# - 检查网络连接
# - 验证镜像标签
# - 更新 Docker 版本
# - 清理本地镜像缓存
```

**7. 自动更新问题**
```bash
# 手动触发更新
docker-compose -f docker-compose.remote.yml restart watchtower

# 检查更新计划
docker-compose -f docker-compose.remote.yml exec watchtower cat /etc/crontab

# 禁用自动更新
docker-compose -f docker-compose.remote.yml stop watchtower

# 解决方案：
# - 调整更新时间间隔
# - 检查通知配置
# - 验证镜像仓库访问权限
```

#### 日志分析

**远程部署日志**
```bash
# 查看远程部署脚本日志
./deploy-remote.sh logs

# 查看 Watchtower 更新日志
docker-compose -f docker-compose.remote.yml logs -f watchtower

# 查看健康检查日志
docker-compose -f docker-compose.remote.yml logs -f healthcheck

# 导出所有服务日志
docker-compose -f docker-compose.remote.yml logs > remote-deployment.log
```

**应用日志**
```bash
# 实时查看应用日志
docker-compose -f docker-compose.prod.yml logs -f frigate-config-ui

# 查看错误日志
docker-compose -f docker-compose.prod.yml logs frigate-config-ui | grep ERROR

# 导出日志到文件
docker-compose -f docker-compose.prod.yml logs frigate-config-ui > app.log
```

**系统日志**
```bash
# 查看系统日志
sudo journalctl -u docker
sudo journalctl -f

# 查看 Docker 事件
docker events --since '1h'

# 检查磁盘空间
docker system df
docker system prune -f  # 清理未使用的资源
```

#### 数据恢复

**数据库恢复**
```bash
# 从备份恢复数据库
docker-compose -f docker-compose.prod.yml exec postgres psql -U frigate -d frigate_config < backup.sql

# 重置数据库（谨慎操作）
docker-compose -f docker-compose.prod.yml down
docker volume rm frigate-configuration-ui_postgres_data
docker-compose -f docker-compose.prod.yml up -d
```

**配置文件恢复**
```bash
# 恢复环境变量
cp .env.backup .env

# 恢复 Nginx 配置
cp nginx.prod.conf.backup nginx.prod.conf

# 重启服务应用配置
docker-compose -f docker-compose.prod.yml restart
```

### 📞 技术支持

#### 获取帮助

**社区支持**
- 📋 [GitHub Issues](https://github.com/SunvidWong/Frigate-Configuration-UI/issues) - 报告问题和功能请求
- 💬 [GitHub Discussions](https://github.com/SunvidWong/Frigate-Configuration-UI/discussions) - 社区讨论
- 📖 [Wiki](https://github.com/SunvidWong/Frigate-Configuration-UI/wiki) - 详细文档

**问题报告模板**
```markdown
## 问题描述
简要描述遇到的问题

## 环境信息
- 操作系统：Ubuntu 22.04
- Docker 版本：20.10.x
- Docker Compose 版本：2.x.x
- 浏览器：Chrome 120.x

## 复现步骤
1. 执行命令 xxx
2. 访问页面 xxx
3. 点击按钮 xxx

## 期望结果
描述期望的正常行为

## 实际结果
描述实际发生的情况

## 日志信息
```bash
# 粘贴相关日志
```

## 其他信息
任何其他相关信息
```

**紧急问题处理**
1. 🔥 **服务完全无法访问** - 检查服务状态和日志
2. 🔒 **安全问题** - 立即更新密码和密钥
3. 💾 **数据丢失** - 使用最近的备份恢复
4. 🚨 **性能严重下降** - 检查资源使用和优化配置

## 🔌 集成

### Frigate集成

本UI可以与现有的Frigate实例集成：

1. **API集成** - 通过REST API与Frigate通信
2. **配置文件** - 直接读写Frigate配置文件
3. **数据库** - 与Frigate共享数据库
4. **MQTT** - 通过MQTT接收实时事件

### 第三方服务

- **Home Assistant** - 通过插件集成
- **Node-RED** - 通过API节点集成
- **Grafana** - 导出监控数据
- **Prometheus** - 暴露指标数据

## 🤝 贡献

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循ESLint和TypeScript规则
- 编写清晰的提交信息
- 添加适当的测试
- 更新相关文档

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议：

- 🐛 **Bug报告**: [创建Issue](https://github.com/SunvidWong/Frigate-Configuration-UI/issues)
- 💡 **功能请求**: [讨论区](https://github.com/SunvidWong/Frigate-Configuration-UI/discussions)
- 💬 **问题咨询**: [Discussions](https://github.com/SunvidWong/Frigate-Configuration-UI/discussions)

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/) - 用户界面框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Lucide React](https://lucide.dev/) - 图标库
- [Frigate](https://frigate.video/) - 视频监控系统

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=SunvidWong/Frigate-Configuration-UI&type=Date)

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️！</p>
  <p>Made with ❤️ by Frigate Community</p>
</div>