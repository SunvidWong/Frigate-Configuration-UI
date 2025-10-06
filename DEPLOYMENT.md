# Frigate Configuration UI - Docker Compose 远程部署指南

## 📋 概述

本指南详细介绍如何使用 Docker Compose 在远程服务器上部署 Frigate Configuration UI 系统。该系统是一个现代化的 Web 应用程序，用于管理和配置 Frigate 视频监控系统。

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │  Frigate UI     │    │     Redis       │
│  (反向代理)      │◄──►│   (主应用)       │◄──►│   (缓存存储)     │
│   Port: 80/443  │    │   Port: 8000    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (可选数据库)   │
                    │   Port: 5432    │
                    └─────────────────┘
```

## 🚀 快速开始

### 1. 系统要求

- **操作系统**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **Docker**: 20.10.0+
- **Docker Compose**: 2.0.0+
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: 最少 10GB 可用空间
- **网络**: 开放端口 80, 443 (可选: 8000, 3000, 9090)

### 2. 安装 Docker 和 Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 3. 获取项目代码

```bash
# 克隆项目
git clone https://github.com/your-repo/frigate-configuration-ui.git
cd frigate-configuration-ui

# 或者下载发布版本
wget https://github.com/your-repo/frigate-configuration-ui/archive/v1.0.0.tar.gz
tar -xzf v1.0.0.tar.gz
cd frigate-configuration-ui-1.0.0
```

## ⚙️ 配置部署

### 1. 环境变量配置

创建生产环境配置文件：

```bash
cp .env.example .env.production
```

编辑 `.env.production` 文件：

```bash
# 基础配置
NODE_ENV=production
PORT=8000

# 应用配置
VITE_APP_TITLE=Frigate Configuration UI
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_HOST=your-domain.com

# 安全配置
VITE_ENABLE_HTTPS=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_MOCK_DATA=false

# 数据库密码 (请修改为强密码)
POSTGRES_PASSWORD=your_strong_password_here
REDIS_PASSWORD=your_redis_password_here
GRAFANA_PASSWORD=your_grafana_password_here

# SSL 证书配置 (如果使用 HTTPS)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### 2. SSL 证书配置 (HTTPS)

如果需要 HTTPS 支持，请准备 SSL 证书：

```bash
# 创建 SSL 目录
mkdir -p ssl

# 方式1: 使用 Let's Encrypt (推荐)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# 方式2: 使用自签名证书 (仅用于测试)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### 3. Nginx 配置优化

编辑 `nginx.conf` 文件以适应生产环境：

```nginx
# 在 server 块中添加 HTTPS 配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 其他配置...
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🚢 部署步骤

### 1. 基础部署

```bash
# 构建并启动核心服务
docker-compose up -d frigate-config-ui nginx redis

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f frigate-config-ui
```

### 2. 完整部署 (包含数据库)

```bash
# 启动包含数据库的完整服务
docker-compose --profile database up -d

# 验证数据库连接
docker-compose exec postgres psql -U frigate -d frigate_config -c "SELECT version();"
```

### 3. 监控部署 (可选)

```bash
# 启动监控服务 (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# 访问监控面板
# Prometheus: http://your-domain.com:9090
# Grafana: http://your-domain.com:3000 (admin/admin123)
```

### 4. 健康检查

```bash
# 检查所有服务健康状态
docker-compose ps

# 测试 API 端点
curl -f http://your-domain.com/api/system/info

# 检查 WebSocket 连接
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  http://your-domain.com/ws
```

## 🔧 运维管理

### 日常操作

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 重启服务
docker-compose restart frigate-config-ui

# 更新应用
git pull origin main
docker-compose build --no-cache frigate-config-ui
docker-compose up -d frigate-config-ui

# 备份数据
docker-compose exec postgres pg_dump -U frigate frigate_config > backup.sql
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

### 扩容和优化

```bash
# 水平扩展应用实例
docker-compose up -d --scale frigate-config-ui=3

# 查看资源使用情况
docker stats

# 清理未使用的镜像和容器
docker system prune -a
```

## 🔒 安全配置

### 1. 防火墙设置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 定期更新

```bash
# 创建更新脚本
cat > update.sh << 'EOF'
#!/bin/bash
set -e

echo "开始更新 Frigate Configuration UI..."

# 备份数据
docker-compose exec postgres pg_dump -U frigate frigate_config > "backup-$(date +%Y%m%d-%H%M%S).sql"

# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose build --no-cache
docker-compose up -d

echo "更新完成！"
EOF

chmod +x update.sh
```

### 3. 监控和告警

```bash
# 创建健康检查脚本
cat > health-check.sh << 'EOF'
#!/bin/bash

# 检查服务状态
if ! curl -f http://localhost/api/system/info > /dev/null 2>&1; then
    echo "服务异常，正在重启..."
    docker-compose restart frigate-config-ui
    
    # 发送告警邮件 (需要配置邮件服务)
    # echo "Frigate UI 服务异常" | mail -s "服务告警" admin@your-domain.com
fi
EOF

chmod +x health-check.sh

# 添加到 crontab (每5分钟检查一次)
echo "*/5 * * * * /path/to/health-check.sh" | crontab -
```

## 🐛 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 查看详细错误日志
   docker-compose logs frigate-config-ui
   
   # 检查端口占用
   sudo netstat -tlnp | grep :8000
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose exec postgres pg_isready -U frigate
   
   # 重置数据库密码
   docker-compose exec postgres psql -U postgres -c "ALTER USER frigate PASSWORD 'new_password';"
   ```

3. **SSL 证书问题**
   ```bash
   # 验证证书有效性
   openssl x509 -in ssl/cert.pem -text -noout
   
   # 测试 SSL 配置
   openssl s_client -connect your-domain.com:443
   ```

4. **性能问题**
   ```bash
   # 查看资源使用情况
   docker stats
   
   # 增加内存限制
   # 在 docker-compose.yml 中添加:
   # deploy:
   #   resources:
   #     limits:
   #       memory: 1G
   ```

### 日志分析

```bash
# 查看 Nginx 访问日志
docker-compose exec nginx tail -f /var/log/nginx/access.log

# 查看应用错误日志
docker-compose logs frigate-config-ui | grep ERROR

# 查看系统资源使用情况
docker-compose exec frigate-config-ui top
```

## 📊 性能优化

### 1. 缓存优化

```bash
# Redis 配置优化
echo "maxmemory 256mb" >> redis.conf
echo "maxmemory-policy allkeys-lru" >> redis.conf
```

### 2. 数据库优化

```sql
-- PostgreSQL 性能调优
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### 3. Nginx 优化

```nginx
# 在 nginx.conf 中添加
worker_processes auto;
worker_connections 2048;

# 启用缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📝 维护计划

### 定期维护任务

- **每日**: 检查服务状态和日志
- **每周**: 备份数据库和配置文件
- **每月**: 更新系统和 Docker 镜像
- **每季度**: 安全审计和性能评估

### 备份策略

```bash
# 创建自动备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/frigate-ui"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec postgres pg_dump -U frigate frigate_config > "$BACKUP_DIR/db-$DATE.sql"

# 备份配置文件
tar -czf "$BACKUP_DIR/config-$DATE.tar.gz" .env.production nginx.conf docker-compose.yml

# 清理7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x backup.sh

# 添加到 crontab (每天凌晨2点备份)
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🆘 技术支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 联系技术支持团队

---

**注意**: 请确保在生产环境中使用强密码，定期更新系统和依赖项，并遵循安全最佳实践。