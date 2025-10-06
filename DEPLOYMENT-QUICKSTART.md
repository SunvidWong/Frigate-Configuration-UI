# 部署快速开始（GHCR）

本文档提供三种部署方式，均使用 GHCR 镜像 `ghcr.io/sunvidwong/frigate-config-ui:latest`。

## 一、单条命令本地部署（Linux/macOS/Windows）

- Linux/macOS（bash/zsh）：

```bash
JWT_SECRET=change-me \
REDIS_PASSWORD=change-me \
POSTGRES_PASSWORD=change-me \
DOCKER_REGISTRY=ghcr.io/sunvidwong \
IMAGE_TAG=latest \
docker compose -f docker-compose.remote.yml up -d
```

- Windows PowerShell：

```powershell
$env:JWT_SECRET="change-me"; $env:REDIS_PASSWORD="change-me"; $env:POSTGRES_PASSWORD="change-me"; $env:DOCKER_REGISTRY="ghcr.io/sunvidwong"; $env:IMAGE_TAG="latest"; docker compose -f docker-compose.remote.yml up -d
```

说明：以上命令一次性部署整套服务（UI + Nginx + Redis + Postgres + 监控）。如需自定义端口与域名，请提前编辑 `.env.remote` 并在命令前 `set -a; source .env.remote; set +a`（Linux/macOS），或在 PowerShell 中通过 `$env:VAR` 设置。

## 二、使用 docker run 部署（仅 UI 容器）

```bash
docker run -d \
  --name frigate-config-ui \
  -p 80:5550 \
  -e NODE_ENV=production \
  -e PORT=5550 \
  -e TZ=Asia/Shanghai \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  ghcr.io/sunvidwong/frigate-config-ui:latest
```

可选：如需后端依赖，请搭配 Redis/Postgres（见下一节的 Compose 示例）。

## 三、使用 docker compose 一次性部署（示例）

最推荐使用仓库内的 `docker-compose.remote.yml`。如果你希望一个最小化示例：

```yaml
services:
  frigate-config-ui:
    image: ghcr.io/sunvidwong/frigate-config-ui:latest
    container_name: frigate-config-ui
    environment:
      - NODE_ENV=production
      - PORT=5550
      - TZ=Asia/Shanghai
    ports:
      - "80:5550"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis
    command: ["redis-server", "--appendonly", "yes"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - ./redis-data:/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      - POSTGRES_USER=frigate
      - POSTGRES_PASSWORD=change-me
      - POSTGRES_DB=frigate
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U frigate"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

networks:
  default:
    name: frigate-network
```

运行：

```bash
docker compose up -d
```

## 预检与登录

- 请确认 Docker 已安装，且 `docker compose version` 正常。
- 如镜像为私有，需先登录 GHCR：

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <github-username> --password-stdin
```

## 常见问题

- 端口冲突：修改 `80:5550` 中前半部分主机端口，例如 `8080:5550`。
- 数据持久化：确保 `./config`、`./data`、`./postgres-data`、`./redis-data` 目录存在且具备写权限。
- 环境变量：在一次性命令中临时设置，或使用 `.env.remote` 统一管理。