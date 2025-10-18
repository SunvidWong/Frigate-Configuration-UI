# 用户指南

本指南详细介绍如何使用 Frigate Configuration UI 配置和部署 Frigate NVR 实例。

## 目录

- [快速开始](#快速开始)
- [三步向导详解](#三步向导详解)
- [多实例管理](#多实例管理)
- [硬件加速配置](#硬件加速配置)
- [故障排查](#故障排查)
- [最佳实践](#最佳实践)

## 快速开始

### 1. 启动服务

```bash
cd docker
docker-compose up -d
```

### 2. 访问 WebUI

打开浏览器访问：`http://localhost:9888`

### 3. 跟随向导完成配置

按照三步向导完成您的第一个实例配置。

## 三步向导详解

### 步骤 1: 硬件配置

![步骤 1 示例](screenshots/step1.png)

#### 实例名称
- **要求**：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符
- **示例**：
  - ✅ `camera-front`
  - ✅ `nvr-01`
  - ✅ `home-security`
  - ❌ `Camera-Front` (包含大写)
  - ❌ `cam_01` (包含下划线)

#### 硬件加速模式

**CPU（通用）**
- 适用于所有环境
- 无需额外配置
- 性能较低，适合少量摄像头

**NVIDIA GPU**
- 需要 NVIDIA 显卡
- 需要安装 NVIDIA Container Toolkit
- 显著提升性能，适合多摄像头场景
- [安装指南](#nvidia-gpu-配置)

**Hailo NPU**
- 需要 Hailo 硬件
- 需要安装 Hailo 驱动
- 低功耗高性能
- [安装指南](#hailo-npu-配置)

---

### 步骤 2: 摄像头配置

![步骤 2 示例](screenshots/step2.png)

#### 方式 A: ONVIF 自动发现

**适用场景**：摄像头支持 ONVIF 协议

**操作步骤**：
1. 点击"ONVIF 扫描"按钮
2. 输入摄像头凭据（用户名/密码）
3. 等待扫描完成（5-10 秒）
4. 选择发现的设备
5. 系统自动配对主码流和子码流

**优点**：
- 自动检测摄像头
- 自动获取流信息
- 支持双镜头摄像机

**注意**：
- 确保摄像头与父容器在同一局域网
- 某些摄像头需要在设置中启用 ONVIF

#### 方式 B: 品牌模板

**适用场景**：ONVIF 不可用或超时

**支持品牌**：
- 海康威视 (Hikvision)
- 大华 (Dahua)
- 宇视 (Uniview)
- 通用 RTSP

**操作步骤**：
1. 点击"品牌模板"
2. 选择摄像头品牌
3. 填写：
   - IP 地址（如 `192.168.1.100`）
   - 用户名（通常是 `admin`）
   - 密码
4. 系统自动生成 RTSP URL
5. （可选）点击"测试 RTSP"验证连接

**RTSP URL 格式**：

海康威视：
```
rtsp://用户名:密码@IP:554/Streaming/Channels/101  # 主码流
rtsp://用户名:密码@IP:554/Streaming/Channels/102  # 子码流
```

大华：
```
rtsp://用户名:密码@IP:554/cam/realmonitor?channel=1&subtype=0  # 主码流
rtsp://用户名:密码@IP:554/cam/realmonitor?channel=1&subtype=1  # 子码流
```

#### RTSP 连接测试

**说明**：测试失败不会阻止部署

**测试失败的常见原因**：
- IP 地址错误
- 用户名/密码错误
- RTSP 路径不匹配
- 网络连接问题

**建议**：
- 测试失败可继续部署
- 部署后在 Frigate UI 中验证画面
- 根据实际情况调整配置

---

### 步骤 3: 复核部署

![步骤 3 示例](screenshots/step3.png)

#### 配置摘要

检查以下信息：
- ✅ 实例名称正确
- ✅ 硬件模式正确
- ✅ 摄像头数量和配置正确
- ✅ RTSP URL 正确

#### 一键部署

点击"开始部署"后，系统会：
1. 验证配置
2. 分配端口块（10 个连续端口）
3. 生成 Frigate 配置文件
4. 创建 Docker 容器
5. 启动容器
6. 等待健康检查通过

#### 部署完成

部署成功后会显示：
- ✅ 实例名称
- 🌐 WebUI 访问地址（如 `http://localhost:5200`）
- 📦 容器 ID

访问 Frigate WebUI 可以看到：
- 摄像头实时画面
- 事件检测
- 录像回放

## 多实例管理

### Dashboard 概览

![Dashboard 示例](screenshots/dashboard.png)

Dashboard 显示所有实例，包括：
- 实例名称
- 运行状态（运行中/已停止）
- 容器 ID
- 创建时间
- 操作按钮

### 实例操作

**启动实例**
```
点击"启动"按钮 → 容器启动 → 访问 WebUI
```

**停止实例**
```
点击"停止"按钮 → 容器停止 → 释放资源
```

**删除实例**
```
点击"删除"按钮 → 确认对话框 → 容器和数据删除
```

**注意**：删除操作不可逆，请谨慎操作！

### 端口分配规则

每个实例自动分配 10 个连续端口：

| 实例 | 端口范围 | WebUI 端口 |
|------|----------|------------|
| 实例 1 | 5200-5209 | 5200 |
| 实例 2 | 5210-5219 | 5210 |
| 实例 3 | 5220-5229 | 5220 |

**端口冲突处理**：
- 系统自动检测端口占用
- 自动顺延到下一个可用块
- 最多尝试 100 次

## 硬件加速配置

### NVIDIA GPU 配置

#### 1. 安装 NVIDIA Container Toolkit

```bash
# 添加 NVIDIA 仓库
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

# 安装工具包
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 重启 Docker
sudo systemctl restart docker
```

#### 2. 验证安装

```bash
# 测试 GPU 访问
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

#### 3. 创建实例

在步骤 1 选择"NVIDIA GPU"模式即可。

### Hailo NPU 配置

#### 1. 安装 Hailo 驱动

参考 Hailo 官方文档安装驱动。

#### 2. 验证设备

```bash
# 检查设备节点
ls /dev/hailo*
```

#### 3. 创建实例

在步骤 1 选择"Hailo NPU"模式。

### CPU 模式（无需配置）

直接选择"CPU（通用）"即可，无需额外配置。

## 故障排查

### 问题 1: 预检失败

**症状**：
```
[ERROR][DOCKER_SOCKET] 未挂载 /var/run/docker.sock
```

**解决**：
编辑 `docker/docker-compose.yml`，添加：
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

重启服务：
```bash
docker-compose restart
```

---

### 问题 2: 摄像头画面无法显示

**排查步骤**：

1. **检查 RTSP URL**
   ```bash
   # 使用 VLC 或 ffplay 测试
   ffplay rtsp://用户名:密码@IP:554/路径
   ```

2. **检查网络连接**
   ```bash
   ping 摄像头IP
   ```

3. **检查摄像头设置**
   - 确认 RTSP 服务已启用
   - 确认用户名密码正确
   - 确认流路径正确

4. **查看 Frigate 日志**
   ```bash
   docker logs frigate-instance-<实例名>
   ```

---

### 问题 3: 端口被占用

**症状**：
```
[ERROR][PORT_CONFLICT] 端口已被占用
```

**解决**：

查看占用端口的进程：
```bash
lsof -i :5200
```

停止占用进程或让系统自动顺延到下一个端口块。

---

### 问题 4: ONVIF 发现超时

**症状**：
```
[WARN][ONVIF_TIMEOUT] ONVIF 设备发现超时
```

**解决**：
1. 确认摄像头支持 ONVIF
2. 在摄像头设置中启用 ONVIF
3. 切换到"品牌模板"方式配置

## 最佳实践

### 1. 实例命名规范

建议使用描述性名称：
- ✅ `front-door` (前门)
- ✅ `backyard-01` (后院 1)
- ✅ `office-entrance` (办公室入口)

避免：
- ❌ `test`
- ❌ `cam1`
- ❌ `asdf`

### 2. 摄像头分组

对于多摄像头场景，建议按区域创建多个实例：

```
实例 1: outdoor (户外)
  - front-door
  - backyard
  - garage

实例 2: indoor (室内)
  - living-room
  - kitchen
  - bedroom
```

### 3. 硬件加速选择

| 场景 | 推荐模式 | 理由 |
|------|----------|------|
| 1-2 个摄像头 | CPU | 足够使用 |
| 3-8 个摄像头 | NVIDIA | 性能提升明显 |
| 8+ 个摄像头 | NVIDIA/Hailo | 必须使用硬件加速 |

### 4. 蓝绿部署

更新摄像头配置时推荐使用蓝绿部署：

```
1. 克隆现有实例 (old-instance → new-instance)
2. 修改新实例配置
3. 部署新实例并测试
4. 确认无误后删除旧实例
```

**优点**：
- 零停机时间
- 可随时回滚
- 风险可控

### 5. 定期备份

```bash
# 备份实例配置
docker cp frigate-instance-<名称>:/config ./backup/

# 备份录像（可选）
docker cp frigate-instance-<名称>:/media/frigate ./backup/media/
```

### 6. 监控和维护

- 定期检查磁盘空间
- 定期清理旧录像
- 定期更新 Frigate 镜像
- 监控容器健康状态

## 高级技巧

### 自定义 Frigate 配置

部署后可以手动编辑配置：

```bash
# 编辑配置文件
cd data/instances/<实例名>/config
vi config.yml

# 重启实例使配置生效
docker restart frigate-instance-<实例名>
```

### 查看日志

```bash
# 实时查看日志
docker logs -f frigate-instance-<实例名>

# 查看最近 100 行
docker logs --tail 100 frigate-instance-<实例名>
```

### 性能优化

1. **降低检测帧率**：在 `config.yml` 中调整 `detect.fps`
2. **使用子码流检测**：减少 CPU/GPU 负载
3. **调整录像保留时间**：平衡存储和需求

## 获取帮助

- 📖 [官方文档](https://github.com/SunvidWong/Frigate-Configuration-UI)
- 🐛 [报告问题](https://github.com/SunvidWong/Frigate-Configuration-UI/issues)
- 💬 [讨论区](https://github.com/SunvidWong/Frigate-Configuration-UI/discussions)

---

**最后更新**：2025-10-18
