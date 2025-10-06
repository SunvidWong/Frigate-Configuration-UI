# Docker 部署指南

## 方式3: 单独使用 Docker

这是最简单的部署方式，只需要一个Docker容器即可运行应用。

### 🚀 快速开始

#### 方法1: 使用部署脚本（推荐）

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/your-repo/docker-run.sh

# 2. 给脚本执行权限
chmod +x docker-run.sh

# 3. 一键部署
./docker-run.sh
```

#### 方法2: 手动 Docker 命令

```bash
# 构建镜像（如果需要本地构建）
docker build -t frigate-config-ui .

# 运行容器（使用 GHCR 镜像，端口统一为 5550）
docker run -d \
  --name frigate-config-ui \
  -p 5550:5550 \
  -e NODE_ENV=production \
  -e PORT=5550 \
  -e TZ=Asia/Shanghai \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/sunvidwong/frigate-config-ui:latest
```

### 📦 镜像信息

- **镜像地址**: `ghcr.io/sunvidwong/frigate-config-ui:latest`
- **容器端口**: 5550
- **主机端口**: 5550 (可自定义)

### 🔧 管理命令

使用部署脚本管理容器：

```bash
# 启动容器
./docker-run.sh start

# 更新容器
./docker-run.sh update

# 停止容器
./docker-run.sh stop

# 查看日志
./docker-run.sh logs

# 查看状态
./docker-run.sh status

# 显示帮助
./docker-run.sh help
```

### 📁 目录结构

```
project/
├── docker-run.sh          # 部署脚本
├── config/                # 配置文件目录
└── data/                  # 数据文件目录
```

### 🌐 访问应用

部署完成后，可以通过以下地址访问：

- **本地访问**: http://localhost:5550
- **远程访问**: http://your-server-ip:5550
- **域名访问**: http://your-domain.com (如经反向代理，可为 80/443)

### 🔄 更新应用

```bash
# 使用脚本更新
./docker-run.sh update

# 或手动更新
docker pull ghcr.io/sunvidwong/frigate-config-ui:latest
docker stop frigate-config-ui
docker rm frigate-config-ui
./docker-run.sh start
```

### 🐛 故障排除

#### 查看容器状态
```bash
docker ps | grep frigate-config-ui
```

#### 查看容器日志
```bash
docker logs frigate-config-ui
```

#### 进入容器调试
```bash
docker exec -it frigate-config-ui sh
```

#### 端口冲突
如果 5550 或您设置的主机端口被占用，可以修改脚本中的 `HOST_PORT` 变量：

```bash
# 编辑脚本
nano docker-run.sh

# 修改端口
HOST_PORT="8080"

#### 容器名冲突
如出现 “container name "frigate-config-ui" is already in use” 错误：
```bash
docker rm -f frigate-config-ui  # 清理已有容器
# 或使用不同容器名：去掉 --name 或更换名称
docker run -d -p 5550:5550 ghcr.io/sunvidwong/frigate-config-ui:latest
```
```

### ⚙️ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| NODE_ENV | production | 运行环境 |
| PORT | 5550 | 容器内端口 |

### 🔑 GHCR 登录（如为私有镜像）

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u sunvidwong --password-stdin
```

登录成功后再执行 `docker pull ghcr.io/sunvidwong/frigate-config-ui:latest` 或上述运行命令。
| TZ | Asia/Shanghai | 时区设置 |

### 🔒 安全建议

1. **防火墙设置**: 确保只开放必要的端口
2. **反向代理**: 建议使用Nginx等反向代理
3. **HTTPS**: 生产环境建议配置SSL证书
4. **定期更新**: 定期更新镜像和容器

### 📊 监控

#### 查看资源使用情况
```bash
docker stats frigate-config-ui
```

#### 查看容器详细信息
```bash
docker inspect frigate-config-ui
```

### 🆘 常见问题

**Q: 容器启动失败？**
A: 检查端口是否被占用，查看容器日志排查问题

**Q: 无法访问应用？**
A: 检查防火墙设置，确保端口已开放

**Q: 数据丢失？**
A: 确保正确挂载了数据卷，数据存储在宿主机目录中

**Q: 如何备份数据？**
A: 直接备份 `config/` 和 `data/` 目录即可