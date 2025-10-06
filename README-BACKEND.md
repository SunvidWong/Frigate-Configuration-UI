# Frigate Configuration UI 后端对接指南

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
npm run install-server
```

### 2. 环境配置

复制 `.env.example` 到 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# API 配置
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_HOST=localhost:8000

# 功能开关
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_DEBUG=true
```

### 3. 启动服务

#### 方式一：分别启动（推荐开发时使用）

```bash
# 终端1：启动后端服务
npm run server-dev

# 终端2：启动前端开发服务器
npm run dev
```

#### 方式二：同时启动（推荐演示使用）

```bash
# 同时启动前后端服务
npm run dev-full
```

#### 方式三：生产模式

```bash
# 构建前端
npm run build

# 启动生产服务器
npm run server
```

## API 文档

### 基础URL
- 开发环境: `http://localhost:8000`
- API路径: `/api`

### 主要端点

#### 系统信息
- `GET /api/system/info` - 获取系统信息

#### 摄像头管理
- `GET /api/cameras` - 获取摄像头列表
- `GET /api/cameras/:id` - 获取单个摄像头
- `POST /api/cameras` - 添加摄像头
- `PUT /api/cameras/:id` - 更新摄像头
- `DELETE /api/cameras/:id` - 删除摄像头
- `POST /api/cameras/discover` - 发现摄像头
- `POST /api/cameras/:id/test` - 测试摄像头连接

#### 硬件加速器
- `GET /api/hardware/accelerators` - 获取硬件加速器列表
- `POST /api/hardware/detect` - 检测硬件

### WebSocket 事件

连接地址: `ws://localhost:8000`

#### 事件类型
- `system_status_update` - 系统状态更新
- `camera_status_change` - 摄像头状态变化
- `hardware_accelerator_status` - 硬件加速器状态
- `model_download_progress` - 模型下载进度
- `deployment_status_update` - 部署状态更新
- `log_entry` - 日志条目
- `system_metrics` - 系统指标

## 功能特性

### 1. 实时数据同步
- WebSocket 连接自动重连
- 摄像头状态实时更新
- 系统状态监控

### 2. 摄像头管理
- 自动发现网络摄像头
- 实时连接测试
- 配置管理

### 3. 硬件加速器支持
- 自动检测可用硬件
- 驱动安装状态检查
- 性能监控

### 4. 错误处理
- API 请求错误处理
- 网络连接异常处理
- 用户友好的错误提示

## 开发指南

### 添加新的API端点

1. 在 `server.js` 中添加路由：
```javascript
app.get('/api/new-endpoint', (req, res) => {
  res.json({
    success: true,
    data: 'response data'
  });
});
```

2. 在 `src/services/api.ts` 中添加方法：
```typescript
async getNewData(): Promise<ApiResponse<NewDataType>> {
  return apiRequest<NewDataType>('/api/new-endpoint');
}
```

3. 在相应的 hook 中使用：
```typescript
const { data, loading, error } = useApiCall(() => frigateAPI.getNewData());
```

### 添加新的WebSocket事件

1. 在 `server.js` 中广播事件：
```javascript
broadcast({
  type: 'new_event_type',
  data: eventData,
  timestamp: new Date().toISOString(),
  id: Math.random().toString(36).substr(2, 9)
});
```

2. 在 hook 中订阅事件：
```typescript
useEffect(() => {
  const handleNewEvent = (data: EventDataType) => {
    // 处理事件数据
  };

  frigateWS.on('new_event_type', handleNewEvent);

  return () => {
    frigateWS.off('new_event_type', handleNewEvent);
  };
}, []);
```

## 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 检查后端服务是否启动
   - 确认端口配置正确
   - 检查防火墙设置

2. **API 请求失败**
   - 确认后端服务运行正常
   - 检查 CORS 配置
   - 验证 API 路径正确

3. **前端构建问题**
   - 清除 node_modules 重新安装
   - 检查 TypeScript 编译错误
   - 确认环境变量配置

### 调试技巧

1. **开启调试模式**
   ```env
   VITE_ENABLE_DEBUG=true
   ```

2. **查看网络请求**
   - 打开浏览器开发者工具
   - 查看 Network 标签页
   - 检查 WebSocket 连接状态

3. **查看控制台日志**
   - 前端：浏览器控制台
   - 后端：终端输出

## 部署说明

### Docker 部署

创建 `Dockerfile`：
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "run", "server"]
```

### 环境变量配置

生产环境配置：
```env
NODE_ENV=production
PORT=8000
VITE_API_BASE_URL=https://your-domain.com
VITE_ENABLE_HTTPS=true
```