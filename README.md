# Frigate 配置与部署 WebUI

一个用于快速配置和部署 Frigate NVR 监控实例的 Web 界面工具。

## ✨ 特性

- 🖥️ **中文界面**：完全中文化的用户界面
- 🔍 **ONVIF 自动发现**：自动扫描局域网内的 ONVIF 摄像头
- 🏷️ **品牌模板**：支持海康威视、大华、宇视等主流品牌
- 🔌 **流配对**：自动配对主码流和子码流
- 🚀 **一键部署**：三步向导完成实例部署
- 💻 **硬件加速**：支持 CPU/NVIDIA/Hailo 硬件加速
- 🔢 **多实例**：管理多个 Frigate 实例，自动端口分配
- 🔄 **实例管理**：启动、停止、克隆、删除实例

## 📋 前置要求

- Docker 20.10+
- Docker Compose v2+
- 4GB+ 内存
- Linux/macOS/Windows (with WSL2)

## 🚀 快速开始

### 方式一：使用 Docker Compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  frigate-config-backend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui:001-frigate-webui-deployment
    container_name: frigate-config-backend
    network_mode: "host"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # 必需：Docker socket
      - ./data:/data  # 数据持久化
    environment:
      - WEB_PORT=9888
      - TZ=Asia/Shanghai
    restart: unless-stopped

  frigate-config-frontend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui-frontend:001-frigate-webui-deployment
    container_name: frigate-config-frontend
    network_mode: "host"
    depends_on:
      - frigate-config-backend
    restart: unless-stopped
```

> **📝 镜像标签说明**：
> - `001-frigate-webui-deployment` - 开发分支最新构建
> - `latest` - 将在合并到 master 分支后可用
> - `v1.0.0` - 版本发布后可用

启动服务：

```bash
docker-compose up -d
```

访问 WebUI：
```
http://localhost:9888
```

或替换为你的宿主机 IP：
```
http://10.10.0.129:9888
```

> **💡 为什么使用 `network_mode: "host"`？**
>
> - ✅ 正确检测宿主机网络（而不是 Docker 内部网络）
> - ✅ ONVIF 扫描可以发现局域网内的摄像头
> - ✅ 部署的 Frigate 实例可以访问摄像头 RTSP 流
>
> **安全建议**：
> - 仅在可信内网环境使用
> - 使用防火墙限制访问来源
> - 不要暴露到公网

### 方式二：从源码构建

#### 1. 克隆仓库

```bash
git clone https://github.com/SunvidWong/Frigate-Configuration-UI.git
cd Frigate-Configuration-UI
```

#### 2. 启动服务

```bash
cd docker
docker-compose up -d
```

#### 3. 访问 WebUI

打开浏览器访问: `http://localhost:9888`

## 📖 使用指南

### 三步向导

#### 步骤 1: 硬件配置
- 选择实例名称（小写字母开头，3-32 字符）
- 选择硬件加速模式（CPU/NVIDIA/Hailo）
- 选择 Frigate 镜像标签（默认 `stable`）

#### 步骤 2: 摄像头配置
- **方式 A: ONVIF 自动发现**
  - 扫描局域网内的 ONVIF 设备
  - 自动配对主码流和子码流
  - 支持双镜头摄像机（自动识别多通道）

- **方式 B: 品牌模板**
  - 选择摄像头品牌（海康/大华/宇视/通用）
  - 填写 IP、用户名、密码
  - 自动生成 RTSP URL

#### 步骤 3: 复核部署
- 检查配置摘要
- 点击"一键部署"
- 等待容器启动
- 访问 Frigate WebUI

### 实例管理

在首页 Dashboard 可以：
- 查看所有实例状态
- 启动/停止实例
- 删除实例
- 克隆实例（复制配置）
- 导出配置文件

## 🔧 配置说明

### 端口分配

每个实例自动分配 10 个连续端口（从 5200 开始）：
- 端口 0: Frigate WebUI (5000)
- 端口 1: RTSP 服务器 (8554)
- 端口 2: WebRTC (8555)

例如：
- 实例 1: 5200-5209
- 实例 2: 5210-5219
- 实例 3: 5220-5229

### 硬件加速

**NVIDIA GPU**:
```bash
# 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**Hailo NPU**:
需要安装 Hailo 驱动并确保 `/dev/hailo0` 可访问。

## 📂 项目结构

```
.
├── backend/                 # Python FastAPI 后端
│   ├── src/
│   │   ├── api/            # API 端点
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   └── validators/     # 验证器
│   └── tests/              # 测试
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── pages/         # 页面
│   │   └── services/      # API 调用
│   └── tests/             # 测试
├── docker/                # Docker 配置
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── data/                  # 数据目录（自动创建）
    └── instances/         # 实例数据
```

## ❓ 常见问题

### Q: 网络检测显示 Docker 内部网络（172.x.x.x）

**问题**：WebUI 显示 `172.18.0.2 172.18.0.0/24` 而不是宿主机网络

**原因**：未使用 host 网络模式

**解决**：
在 `docker-compose.yml` 中添加：
```yaml
services:
  frigate-config-backend:
    network_mode: "host"  # ← 必须添加
```

### Q: 预检失败：未挂载 Docker socket

**错误**：`[ERROR][DOCKER_SOCKET] 未挂载 /var/run/docker.sock`

**解决**：
在 `docker-compose.yml` 中添加：
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### Q: 端口冲突

**错误**：`[ERROR][PORT_CONFLICT] 端口已被占用`

**解决**：
系统会自动顺延端口块。如果持续失败，手动释放被占用的端口。

### Q: RTSP 测试失败

**警告**：`[WARN][RTSP_TEST_FAIL] RTSP 连通性测试失败`

**说明**：
RTSP 测试失败不会阻止部署。可能原因：
- 摄像头 IP 错误
- 用户名/密码错误
- RTSP 路径不匹配
- 网络连接问题

检查配置后可继续部署。

### Q: ONVIF 发现超时

**警告**：`[WARN][ONVIF_TIMEOUT] ONVIF 设备发现超时`

**解决**：
- 确认摄像头支持 ONVIF
- 检查网络连接
- 切换到"品牌模板"方式配置

## 🔒 安全注意事项

- **不要暴露到公网**：默认配置仅用于局域网
- **更改默认密码**：部署后及时修改 Frigate 管理密码
- **HTTPS 反向代理**：生产环境建议使用 Nginx + SSL
- **防火墙规则**：限制访问来源 IP

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Frigate](https://frigate.video/) - 优秀的开源 NVR 项目
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [React](https://react.dev/) - 用户界面库

## 📞 联系方式

- GitHub Issues: https://github.com/SunvidWong/Frigate-Configuration-UI/issues
- Email: [您的邮箱]

---

**注意**：本项目仍在开发中，欢迎反馈和建议！
