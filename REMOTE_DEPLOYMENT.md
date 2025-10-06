# Frigate Configuration UI 远程部署指南

## 🚀 快速开始

本指南将帮助您在云服务器上部署 Frigate Configuration UI，支持多种云平台和部署方式。

## 📋 部署选项

### 1. 云服务器部署 (推荐)
- **适用于**: 阿里云、腾讯云、AWS、DigitalOcean 等
- **优势**: 完全控制、高性能、可扩展
- **成本**: 中等

### 2. 容器平台部署
- **适用于**: Railway、Render、Fly.io
- **优势**: 简单快速、自动扩容
- **成本**: 低到中等

### 3. Serverless 部署
- **适用于**: Vercel、Netlify (仅前端)
- **优势**: 零运维、按需付费
- **成本**: 低

## 🌐 方案一：云服务器部署

### 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **内存**: 最低 2GB，推荐 4GB+
- **存储**: 最低 20GB，推荐 50GB+
- **网络**: 公网 IP，开放端口 80、443

### 快速部署脚本

```bash
# 1. 下载部署脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/frigate-ui/main/scripts/remote-deploy.sh -o remote-deploy.sh
chmod +x remote-deploy.sh

# 2. 运行部署
./remote-deploy.sh --domain your-domain.com --email your-email@example.com
```

### 手动部署步骤

#### 步骤 1: 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用 Docker 组权限
newgrp docker
```

#### 步骤 2: 克隆项目

```bash
# 克隆项目
git clone https://github.com/your-repo/frigate-configuration-ui.git
cd frigate-configuration-ui

# 或者直接下载发布版本
wget https://github.com/your-repo/frigate-ui/releases/latest/download/frigate-ui.tar.gz
tar -xzf frigate-ui.tar.gz
cd frigate-ui
```

#### 步骤 3: 配置环境

```bash
# 复制环境配置
cp .env.production .env

# 编辑配置文件
nano .env
```

**重要配置项**:
```env
# 域名配置
DOMAIN=your-domain.com
BASE_URL=https://your-domain.com

# 数据库配置
POSTGRES_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_redis_password_here

# SSL 配置
SSL_EMAIL=your-email@example.com
ENABLE_SSL=true

# 安全配置
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

#### 步骤 4: 配置域名和 SSL

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot certonly --standalone -d your-domain.com -m your-email@example.com --agree-tos --non-interactive

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

#### 步骤 5: 启动服务

```bash
# 构建并启动服务
docker-compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 步骤 6: 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🚂 方案二：Railway 部署

Railway 是一个现代化的云平台，支持一键部署。

### 部署步骤

1. **Fork 项目到您的 GitHub**

2. **连接 Railway**
   - 访问 [Railway](https://railway.app)
   - 使用 GitHub 登录
   - 点击 "New Project" → "Deploy from GitHub repo"

3. **配置环境变量**
   ```env
   NODE_ENV=production
   PORT=8000
   POSTGRES_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   DOMAIN=${{RAILWAY_STATIC_URL}}
   ```

4. **添加服务**
   - PostgreSQL: 点击 "Add Service" → "Database" → "PostgreSQL"
   - Redis: 点击 "Add Service" → "Database" → "Redis"

5. **部署**
   - Railway 会自动检测 Dockerfile 并部署
   - 部署完成后会提供一个公网 URL

### Railway 配置文件

创建 `railway.toml`:

```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[[services]]
name = "frigate-ui"
source = "."

[services.variables]
NODE_ENV = "production"
PORT = "8000"
```

## ☁️ 方案三：DigitalOcean App Platform

### 部署配置

创建 `.do/app.yaml`:

```yaml
name: frigate-configuration-ui
services:
- name: web
  source_dir: /
  github:
    repo: your-username/frigate-configuration-ui
    branch: main
  run_command: npm run server
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8000
  health_check:
    http_path: /health
  env:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8000"
  - key: DOMAIN
    value: ${APP_DOMAIN}

databases:
- name: postgres
  engine: PG
  version: "13"
  size_slug: db-s-1vcpu-1gb

- name: redis
  engine: REDIS
  version: "6"
  size_slug: db-s-1vcpu-1gb
```

### 部署步骤

1. 安装 DigitalOcean CLI
2. 登录并部署：
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

## 🔧 方案四：AWS ECS 部署

### 使用 AWS Copilot

```bash
# 安装 Copilot
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
chmod +x copilot && sudo mv copilot /usr/local/bin

# 初始化应用
copilot app init frigate-ui

# 初始化服务
copilot svc init --name web --svc-type "Backend Service"

# 部署
copilot svc deploy --name web --env production
```

### Copilot 配置文件

`copilot/web/copilot.yml`:
```yaml
name: web
type: Backend Service

http:
  healthcheck: '/health'

image:
  build: './Dockerfile'

secrets:
  - POSTGRES_PASSWORD
  - REDIS_PASSWORD
  - JWT_SECRET

variables:
  NODE_ENV: production
  PORT: 8000

count:
  min: 1
  max: 10
  cooldown:
    scale_in_cooldown: 300s
    scale_out_cooldown: 120s
  target_cpu: 70
  target_memory: 80

network:
  vpc:
    enable_logs: true
    placement: 'private'

storage:
  volumes:
    myEFSVolume:
      efs: true
      path: /data
```

## 🐳 Docker Hub 镜像方案

### 构建和推送镜像

```bash
# 构建镜像
docker build -t your-username/frigate-ui:latest .

# 推送到 Docker Hub
docker push your-username/frigate-ui:latest

# 多架构构建
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t your-username/frigate-ui:latest --push .
```

### 使用预构建镜像部署

```yaml
# docker-compose.remote.yml
version: '3.8'

services:
  frigate-config-ui:
    image: your-username/frigate-ui:latest
    ports:
      - "80:8000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://user:pass@postgres:5432/frigate
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: frigate_config
      POSTGRES_USER: frigate
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 🔄 CI/CD 自动化部署

### GitHub Actions

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ secrets.DOCKER_USERNAME }}/frigate-ui:latest
          ${{ secrets.DOCKER_USERNAME }}/frigate-ui:${{ github.sha }}
        platforms: linux/amd64,linux/arm64
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/frigate-ui
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

## 🔒 安全配置

### 1. 防火墙配置

```bash
# 只开放必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL 证书自动续期

```bash
# 添加 crontab 任务
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 3. 定期备份

```bash
# 创建备份脚本
cat > /opt/frigate-ui/backup-cron.sh << 'EOF'
#!/bin/bash
cd /opt/frigate-ui
./scripts/backup.sh data
# 上传到云存储
# aws s3 cp /opt/frigate-ui/backups/ s3://your-backup-bucket/ --recursive
EOF

chmod +x /opt/frigate-ui/backup-cron.sh

# 添加定时任务
echo "0 2 * * * /opt/frigate-ui/backup-cron.sh" | crontab -
```

## 📊 监控和日志

### 1. 系统监控

```bash
# 安装监控脚本
./scripts/monitor.sh health

# 设置定时健康检查
echo "*/5 * * * * /opt/frigate-ui/scripts/monitor.sh health" | crontab -
```

### 2. 日志管理

```bash
# 配置日志轮转
sudo tee /etc/logrotate.d/frigate-ui << EOF
/opt/frigate-ui/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
```

## 🚨 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查日志
   docker-compose -f docker-compose.prod.yml logs
   
   # 检查端口占用
   sudo netstat -tlnp | grep :80
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose -f docker-compose.prod.yml exec postgres pg_isready
   
   # 重置数据库密码
   docker-compose -f docker-compose.prod.yml exec postgres psql -U frigate -c "ALTER USER frigate PASSWORD 'new_password';"
   ```

3. **SSL 证书问题**
   ```bash
   # 检查证书有效期
   openssl x509 -in ./ssl/cert.pem -text -noout | grep "Not After"
   
   # 手动续期
   sudo certbot renew --force-renewal
   ```

## 📞 技术支持

如果您在部署过程中遇到问题，可以：

1. 查看项目 [Issues](https://github.com/your-repo/frigate-ui/issues)
2. 提交新的 Issue 并附上详细的错误信息
3. 加入我们的社区讨论

## 🎉 部署完成

恭喜！您已经成功部署了 Frigate Configuration UI。现在您可以：

- 访问您的应用: `https://your-domain.com`
- 查看监控面板: `https://your-domain.com/grafana`
- 管理您的 Frigate 配置

记得定期更新和备份您的部署！ 🚀