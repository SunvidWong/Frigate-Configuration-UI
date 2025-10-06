# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY package-server.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建前端应用
RUN npm run build

# 生产阶段 - 使用轻量级镜像
FROM node:18-alpine AS production

# 安装必要的系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    curl

WORKDIR /app

# 复制生产环境依赖
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/package*.json ./

# 复制构建后的前端文件
COPY --from=builder /app/dist ./dist/

# 复制服务器代码和其他必要文件
COPY server.js .
COPY src ./src/
COPY public ./public/
COPY .env.example .env

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S frigate -u 1001

# 创建必要的目录并设置权限
RUN mkdir -p /app/config /app/logs /app/data && \
    chown -R frigate:nodejs /app

USER frigate

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/system/health || exit 1

# 启动命令
CMD ["node", "server.js"]