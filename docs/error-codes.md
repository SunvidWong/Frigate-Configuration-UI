# 错误码对照表

本文档列出了所有错误码及其中文描述和修复建议。

## Docker 相关错误

### DOCKER_SOCKET

**描述**：未挂载 /var/run/docker.sock

**修复建议**：
```yaml
# 在 docker-compose.yml 中添加：
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### DOCKER_DAEMON

**描述**：Docker daemon 不可达

**修复建议**：
```bash
# 确认 Docker 服务正在运行
sudo systemctl start docker

# 检查 Docker 状态
sudo systemctl status docker
```

## 镜像相关错误

### IMAGE_PULL

**描述**：镜像拉取失败且本地无缓存

**修复建议**：
- 检查网络连接
- 使用已存在的镜像标签（如 `stable`）
- 手动拉取镜像：`docker pull ghcr.io/blakeblackshear/frigate:stable`

### IMAGE_CACHE_OLD

**描述**：本地镜像缓存已超过 30 天，可能已过期

**修复建议**：
```bash
# 拉取最新镜像
docker pull ghcr.io/blakeblackshear/frigate:stable
```

## 端口相关错误

### PORT_CONFLICT

**描述**：端口已被占用

**修复建议**：
- 系统会自动顺延到下一个可用端口块
- 手动释放端口：`lsof -i :5200`
- 停止占用端口的服务

### PORT_EXHAUSTED

**描述**：端口分配已耗尽（尝试 100 次后仍无可用端口块）

**修复建议**：
- 删除未使用的实例以释放端口
- 手动指定端口范围

## 名称验证错误

### NAME_INVALID

**描述**：名称格式无效

**要求**：名称必须符合以下格式：
- 小写字母开头
- 仅包含小写字母、数字和连字符
- 长度 3-32 字符
- 正则表达式：`^[a-z][a-z0-9-]{2,31}$`

**示例**：
- ✅ `camera-front`
- ✅ `cam123`
- ✅ `nvr-01-main`
- ❌ `Camera` (包含大写)
- ❌ `ab` (过短)
- ❌ `cam_front` (包含下划线)

### NAME_DUP

**描述**：名称已存在

**修复建议**：
- 使用不同的名称
- 删除同名的实例/摄像头

### NAME_RESERVED

**描述**：名称为系统保留关键字

**保留名称列表**：
- `frigate`
- `frigate-config-deploy`

**修复建议**：使用其他名称

## RTSP 相关错误

### RTSP_TEST_FAIL

**描述**：RTSP 连通性测试失败

**修复建议**：
- 检查摄像头 IP 地址
- 验证用户名和密码
- 确认 RTSP 路径正确
- **注意**：测试失败不阻止部署，可继续

### RTSP_AUTH_FAIL

**描述**：RTSP 鉴权失败 (401 Unauthorized)

**修复建议**：
- 检查摄像头用户名是否正确
- 检查密码是否正确
- 确认账号未被锁定

### RTSP_TIMEOUT

**描述**：RTSP 连接超时

**修复建议**：
- 检查摄像头 IP 地址是否可达（ping 测试）
- 检查网络连接
- 检查防火墙设置
- 确认摄像头电源开启

### RTSP_INVALID_URL

**描述**：RTSP URL 格式无效或路径不匹配

**修复建议**：
- 检查 RTSP 路径是否正确
- 尝试其他品牌模板
- 参考摄像头厂商文档

## 硬件相关警告

### HW_UNAVAILABLE

**描述**：选择的硬件模式不可用，已自动降级为 CPU 模式

**修复建议（NVIDIA）**：
```bash
# 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**修复建议（Hailo）**：
- 安装 Hailo 驱动
- 确认 `/dev/hailo0` 设备可访问

## ONVIF 相关错误

### ONVIF_TIMEOUT

**描述**：ONVIF 设备发现超时

**修复建议**：
- 确认摄像头支持 ONVIF 协议
- 检查网络连接
- 增加超时时间
- 切换到品牌模板方式配置

### ONVIF_AUTH_FAIL

**描述**：ONVIF 鉴权失败

**修复建议**：
- 检查摄像头用户名和密码
- 确保账号有 ONVIF 访问权限
- 在摄像头设置中启用 ONVIF 服务

## 错误格式说明

所有错误/警告都遵循统一格式：

```
[ERROR][错误码] 中文描述
修复: 具体修复步骤
```

或

```
[WARN][错误码] 中文描述
```

**示例**：
```
[ERROR][DOCKER_SOCKET] 未挂载 /var/run/docker.sock
修复: 请在 docker-compose.yml 中添加 volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

## 日志查看

查看详细错误日志：

```bash
# 查看父容器日志
docker logs frigate-config-deploy

# 查看实例容器日志
docker logs frigate-instance-<实例名称>
```

## 常见问题排查流程

1. **检查预检日志**：启动时的预检输出
2. **查看错误码**：根据错误码查找本文档
3. **应用修复建议**：按照建议步骤操作
4. **重启服务**：`docker-compose restart`
5. **验证修复**：再次尝试操作

## 反馈问题

如果遇到未在此列出的错误，请：
1. 记录完整错误信息
2. 提交 GitHub Issue
3. 附上相关日志

---

**最后更新**：2025-10-18
