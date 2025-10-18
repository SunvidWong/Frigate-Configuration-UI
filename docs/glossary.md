# 词汇表

本文档提供项目中使用的术语的中英文对照。

## A-Z

### C

**Camera** - 摄像头
- 网络摄像机设备
- 通过 RTSP 协议提供视频流
- 可以有多个通道（主码流/子码流）

**Channel** - 通道
- 摄像头的视频流通道
- 主通道(Main)：高分辨率，用于录像
- 子通道(Sub)：低分辨率，用于检测

**Container** - 容器
- Docker 容器实例
- 运行 Frigate NVR 软件
- 每个实例对应一个容器

**CPU Mode** - CPU 模式
- 使用 CPU 进行视频处理
- 无需额外硬件
- 性能较低

### D

**Dashboard** - 仪表盘/控制台
- 实例管理界面
- 显示所有实例状态
- 提供操作入口

**Daemon** - 守护进程
- 后台运行的服务程序
- Docker Daemon：Docker 守护进程

**Deployment** - 部署
- 创建并启动 Frigate 实例的过程
- 包括配置生成、容器创建、启动等步骤

**Detector** - 检测器
- 用于目标检测的硬件/软件
- CPU/NVIDIA/Hailo 等类型

**Docker Socket** - Docker 套接字
- `/var/run/docker.sock`
- 用于与 Docker daemon 通信的 Unix socket

### F

**Frigate** - Frigate NVR
- 开源网络视频录像机软件
- 基于 AI 的目标检测和录像

### H

**Hardware Acceleration** - 硬件加速
- 使用专用硬件（GPU/NPU）加速视频处理
- 提高性能，降低 CPU 负载

**Hailo NPU** - Hailo 神经网络处理单元
- 专用 AI 加速硬件
- 低功耗高性能

**Health Check** - 健康检查
- 检测容器/服务是否正常运行
- 用于判断部署是否成功

### I

**Instance** - 实例
- 一个独立的 Frigate NVR 部署单元
- 包含配置、容器、端口分配等
- 可以管理多个摄像头

**IP Address** - IP 地址
- 摄像头的网络地址
- 格式：`192.168.1.100`

### M

**Main Stream** - 主码流
- 高分辨率视频流
- 用于录像存储
- 通常为 1080p 或更高

**MQTT** - 消息队列遥测传输
- 物联网通信协议
- Frigate 可选功能

### N

**NVIDIA GPU** - NVIDIA 图形处理单元
- 用于硬件加速
- 需要 NVIDIA Container Toolkit

**NVR** - 网络视频录像机 (Network Video Recorder)
- 用于录制和管理网络摄像头视频

### O

**ONVIF** - 开放网络视频接口论坛
- 网络摄像机标准协议
- 用于自动发现和配置摄像头

### P

**Port Block** - 端口块
- 连续的 10 个端口
- 每个实例分配一个端口块
- 从 5200 开始递增

**Preflight Check** - 预检查
- 启动前的环境检查
- 包括 Docker socket、daemon 等

**Profile** - 配置文件/流配置
- ONVIF 术语，指摄像头的流配置
- 包含分辨率、码率、帧率等信息

### R

**RTSP** - 实时流协议 (Real Time Streaming Protocol)
- 用于传输视频流的网络协议
- 格式：`rtsp://username:password@ip:port/path`

**Recording** - 录像
- 将视频流保存到存储设备
- Frigate 的核心功能之一

**Restart Policy** - 重启策略
- 容器退出后的重启行为
- 本项目使用 `restart: no` (快速失败)

### S

**Snapshot** - 快照
- 事件发生时的静态图像
- 用于快速预览

**Stream** - 视频流
- 实时视频数据流
- 通过 RTSP 协议传输

**Sub Stream** - 子码流
- 低分辨率视频流
- 用于目标检测
- 降低 CPU/GPU 负载

### T

**Tag** - 标签
- Docker 镜像版本标识
- 例如：`stable`, `latest`, `v1.0.0`

**Timezone** - 时区
- 用于录像时间戳
- IANA 格式：`Asia/Shanghai`, `UTC`

**Template** - 模板
- 品牌 RTSP 路径模板
- 用于非 ONVIF 摄像头配置

### W

**WebUI** - Web 用户界面
- 基于浏览器的图形界面
- 本项目的主要交互方式

**Wizard** - 向导
- 分步引导用户完成配置的界面
- 本项目为三步向导

## 缩写词

| 缩写 | 全称 | 中文 |
|------|------|------|
| AI | Artificial Intelligence | 人工智能 |
| API | Application Programming Interface | 应用程序编程接口 |
| CI/CD | Continuous Integration/Continuous Deployment | 持续集成/持续部署 |
| CPU | Central Processing Unit | 中央处理器 |
| GPU | Graphics Processing Unit | 图形处理器 |
| NPU | Neural Processing Unit | 神经网络处理单元 |
| NVR | Network Video Recorder | 网络视频录像机 |
| ONVIF | Open Network Video Interface Forum | 开放网络视频接口论坛 |
| RTSP | Real Time Streaming Protocol | 实时流协议 |
| UI | User Interface | 用户界面 |
| URL | Uniform Resource Locator | 统一资源定位符 |
| YAML | YAML Ain't Markup Language | YAML 不是标记语言 |

## 常用术语

### 中文 → 英文

- **部署** → Deployment
- **摄像头** → Camera
- **实例** → Instance
- **端口** → Port
- **配置** → Configuration
- **录像** → Recording
- **检测** → Detection
- **快照** → Snapshot
- **主码流** → Main Stream
- **子码流** → Sub Stream
- **硬件加速** → Hardware Acceleration
- **向导** → Wizard
- **仪表盘** → Dashboard
- **预检查** → Preflight Check
- **容器** → Container
- **镜像** → Image
- **错误码** → Error Code
- **修复建议** → Fix Suggestion

### 英文 → 中文

- **Deployment** → 部署
- **Camera** → 摄像头
- **Instance** → 实例
- **Port** → 端口
- **Configuration** → 配置
- **Recording** → 录像
- **Detection** → 检测
- **Snapshot** → 快照
- **Main Stream** → 主码流
- **Sub Stream** → 子码流
- **Hardware Acceleration** → 硬件加速
- **Wizard** → 向导
- **Dashboard** → 仪表盘
- **Preflight Check** → 预检查
- **Container** → 容器
- **Image** → 镜像
- **Error Code** → 错误码
- **Fix Suggestion** → 修复建议

## 技术概念

### 快速失败 (Fast-Fail)

**定义**：遇到错误时立即退出，而不是尝试恢复

**应用**：
- 预检失败时立即退出（exit code 1）
- 配合 `restart: no` 避免无限重启循环

**好处**：
- 快速发现问题
- 避免浪费资源
- 便于排查故障

### 端口块分配 (Port Block Allocation)

**定义**：为每个实例分配一组连续的 10 个端口

**规则**：
- 起始端口：5200
- 块大小：10 个端口
- 分配方式：顺序递增
- 冲突处理：自动顺延

**示例**：
```
实例 1: 5200-5209
实例 2: 5210-5219
实例 3: 5220-5229
```

### 流配对 (Stream Pairing)

**定义**：将摄像头的主码流和子码流自动配对

**规则**：
- 主码流：分辨率最高的流
- 子码流：分辨率较低的流（像素比 < 0.6）
- 用途：主码流录像，子码流检测

**算法优先级**：
1. 分辨率（像素数）
2. 码率
3. 帧率
4. 编码格式

### 蓝绿部署 (Blue-Green Deployment)

**定义**：维护两个相同的生产环境，交替更新

**应用场景**：
- 更新摄像头配置
- 测试新配置
- 零停机迁移

**流程**：
```
1. 绿色环境（当前运行）
2. 克隆为蓝色环境
3. 更新蓝色环境配置
4. 测试蓝色环境
5. 切换流量到蓝色环境
6. 删除绿色环境
```

## 参考资料

- [Frigate 官方文档](https://docs.frigate.video/)
- [ONVIF 规范](https://www.onvif.org/)
- [RTSP 规范](https://tools.ietf.org/html/rfc2326)
- [Docker 文档](https://docs.docker.com/)

---

**最后更新**：2025-10-18
