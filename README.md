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
git clone https://github.com/your-username/frigate-configuration-ui.git
cd frigate-configuration-ui

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

### 构建Docker镜像

```bash
# 构建应用
docker build -t frigate-config-ui .

# 运行容器
docker run -p 8000:8000 frigate-config-ui
```

### Docker Compose

```yaml
version: '3.8'
services:
  frigate-config-ui:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
    volumes:
      - ./config:/app/config
    restart: unless-stopped
```

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

- 🐛 **Bug报告**: [创建Issue](https://github.com/your-username/frigate-configuration-ui/issues)
- 💡 **功能请求**: [讨论区](https://github.com/your-username/frigate-configuration-ui/discussions)
- 💬 **问题咨询**: [Discussions](https://github.com/your-username/frigate-configuration-ui/discussions)

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/) - 用户界面框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Lucide React](https://lucide.dev/) - 图标库
- [Frigate](https://frigate.video/) - 视频监控系统

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/frigate-configuration-ui&type=Date)

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️！</p>
  <p>Made with ❤️ by Frigate Community</p>
</div>