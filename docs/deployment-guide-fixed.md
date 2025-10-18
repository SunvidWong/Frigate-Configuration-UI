# 部署指南（修复版）

**版本**：v1.1（修复 #FIX-001）
**更新时间**：2025-10-18
**适用场景**：Docker 模式部署

---

## 🔧 已修复的问题

### 修复 #FIX-001：Docker 模式下的网络检测问题

**修复内容**：
- ✅ 使用 host 网络模式，正确检测宿主机网络
- ✅ 添加网络检测 API（`/api/network/interfaces`）
- ✅ 过滤 Docker 内部网络（172.x.x.x）
- ✅ ONVIF 扫描可以正确发现局域网设备

**修复前**：
```
自动检测到的网络：
eth0 默认
172.18.0.2 172.18.0.0/24  ← 错误的 Docker 内部网络
```

**修复后**：
```
自动检测到的网络：
eth0 默认
10.10.0.129 10.10.0.0/24  ← 正确的宿主机网络
```

---

## 🚀 快速开始

### 1. 拉取最新代码

```bash
cd Frigate-Configuration-UI
git pull origin master
```

### 2. 重新构建镜像

```bash
cd docker
docker-compose build
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 验证网络检测

打开浏览器访问：
```
http://10.10.0.129:9888
```

在 WebUI 中应该可以看到正确的宿主机网络信息。

---

## 📋 部署前检查清单

### 环境要求
- [x] Docker 20.10+
- [x] Docker Compose v2+
- [x] 宿主机内存 >= 4GB
- [x] 宿主机可以访问局域网（与摄像头同网段）

### 网络要求
- [x] 宿主机与摄像头在同一局域网
- [x] 宿主机 IP：10.10.0.129（示例）
- [x] 网络段：10.10.0.0/24
- [x] 端口未被占用：9888（WebUI）、5200+（Frigate 实例）

### 权限要求
- [x] Docker socket 可访问（`/var/run/docker.sock`）
- [x] 当前用户在 docker 组（或使用 sudo）

---

## 🔍 验证修复

### 测试 1：网络检测 API

```bash
# 测试网络接口检测
curl http://10.10.0.129:9888/api/network/interfaces

# 预期输出（示例）
{
  "success": true,
  "interfaces": [
    {
      "interface": "eth0",
      "ip": "10.10.0.129",
      "netmask": "255.255.255.0",
      "network": "10.10.0.0/24",
      "is_default": true
    }
  ],
  "default": {
    "interface": "eth0",
    "ip": "10.10.0.129",
    "netmask": "255.255.255.0",
    "network": "10.10.0.0/24"
  },
  "count": 1
}
```

**验证点**：
- ✅ IP 地址是宿主机 IP（10.10.0.129）
- ✅ 网络段是宿主机网段（10.10.0.0/24）
- ❌ 不应该显示 Docker 内部网络（172.18.0.0/24）

---

### 测试 2：ONVIF 扫描网络信息

```bash
# 获取 ONVIF 扫描网络信息
curl http://10.10.0.129:9888/api/network/onvif-scan-info

# 预期输出
{
  "success": true,
  "info": {
    "ip": "10.10.0.129",
    "network": "10.10.0.0/24",
    "broadcast": "10.10.0.255",
    "interface": "eth0"
  }
}
```

**验证点**：
- ✅ 广播地址正确（10.10.0.255）
- ✅ 可以用于 ONVIF 设备扫描

---

### 测试 3：ONVIF 设备扫描

**步骤**：
1. 访问 WebUI：`http://10.10.0.129:9888`
2. 进入三步向导
3. 步骤 1：填写实例名称，选择硬件模式
4. 步骤 2：选择"ONVIF 扫描"
5. 输入摄像头用户名/密码
6. 点击"扫描局域网设备"

**预期结果**：
- ✅ 成功发现局域网内的摄像头（10.10.0.x）
- ✅ 显示摄像头信息（品牌、型号、IP）
- ✅ 可以选择摄像头并配对主/子码流

---

### 测试 4：一键部署

**步骤**：
1. 完成三步向导（添加摄像头）
2. 步骤 3：复核配置
3. 点击"一键部署"
4. 等待部署完成

**预期结果**：
- ✅ 容器创建成功
- ✅ 可以访问 Frigate UI（http://10.10.0.129:5200）
- ✅ 摄像头画面正常显示

---

## ⚙️ 配置说明

### docker-compose.yml 配置

**关键变更**：使用 `network_mode: "host"`

```yaml
services:
  backend:
    container_name: frigate-config-deploy
    network_mode: "host"  # ← 关键配置
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ../data:/data
    environment:
      - WEB_PORT=9888
      - TZ=UTC

  frontend:
    container_name: frigate-config-ui
    network_mode: "host"  # ← 关键配置
    depends_on:
      - backend
```

**说明**：
- `network_mode: "host"` 让容器使用宿主机网络
- 移除了 `ports` 配置（host 模式不需要）
- 移除了 `networks` 定义（host 模式不需要）

---

## 🔐 安全注意事项

### Host 网络模式的影响

**优点**：
- ✅ 容器可以正确检测宿主机网络
- ✅ ONVIF 扫描可以发现局域网设备
- ✅ 配置简单，无需额外网络配置

**缺点**：
- ⚠️ 容器可以访问宿主机所有网络接口
- ⚠️ 端口直接绑定到宿主机（可能冲突）
- ⚠️ 网络隔离性降低

**缓解措施**：
1. **仅配置 UI 使用 host 模式**
   - Frigate 实例仍然使用 bridge 网络（隔离）

2. **防火墙规则**
   ```bash
   # 限制 9888 端口访问（仅局域网）
   sudo ufw allow from 10.10.0.0/24 to any port 9888
   sudo ufw deny 9888
   ```

3. **仅在内网使用**
   - 不要将 9888 端口暴露到公网
   - 使用 VPN 远程访问

---

## 🛠️ 故障排查

### 问题 1：容器启动失败

**症状**：
```bash
docker-compose up -d
# ERROR: Cannot create container for service backend
```

**解决**：
```bash
# 检查是否有其他容器使用 host 网络且占用端口
docker ps -a | grep 9888

# 停止占用端口的容器
docker stop <container_id>

# 重新启动
docker-compose up -d
```

---

### 问题 2：仍然显示 Docker 内部网络

**症状**：
WebUI 显示 `172.18.0.x`

**检查**：
```bash
# 1. 确认 docker-compose.yml 已更新
grep "network_mode" docker/docker-compose.yml

# 应该输出：
# network_mode: "host"

# 2. 重新构建镜像
docker-compose build --no-cache

# 3. 重启容器
docker-compose down
docker-compose up -d
```

---

### 问题 3：ONVIF 扫描超时

**症状**：
扫描设备时超时，未发现摄像头

**检查**：
```bash
# 1. 验证网络连通性
ping 10.10.0.100  # 替换为摄像头 IP

# 2. 检查摄像头 ONVIF 服务
# 在摄像头设置中确认 ONVIF 已启用

# 3. 测试 ONVIF 端口
nc -zv 10.10.0.100 80
nc -zv 10.10.0.100 8080

# 4. 查看后端日志
docker logs frigate-config-deploy
```

---

### 问题 4：端口冲突

**症状**：
```
Error starting userland proxy: listen tcp4 0.0.0.0:9888: bind: address already in use
```

**解决**：
```bash
# 1. 查找占用 9888 端口的进程
sudo lsof -i :9888

# 2. 停止占用端口的进程
sudo kill <PID>

# 或者修改 WebUI 端口
# 编辑 docker-compose.yml
environment:
  - WEB_PORT=9889  # 使用其他端口
```

---

## 📊 网络架构图

### 修复前（Bridge 模式）

```
┌─────────────────────────────────────┐
│ 宿主机 (10.10.0.129)                │
│  ├─ 物理网卡: 10.10.0.0/24          │
│  └─ Docker Bridge 网络              │
│      ├─ frigate-config (容器)       │
│      │   └─ eth0: 172.18.0.2/24     │  ← 错误的网络
│      └─ NAT                          │
└─────────────────────────────────────┘
        ↓
    ❌ ONVIF 扫描失败（网络段不对）
```

### 修复后（Host 模式）

```
┌─────────────────────────────────────┐
│ 宿主机 (10.10.0.129)                │
│  ├─ 物理网卡: 10.10.0.0/24          │
│  └─ frigate-config (容器)           │
│      └─ 直接使用宿主机网络          │  ← 正确的网络
└─────────────────────────────────────┘
        ↓
    ✅ ONVIF 扫描成功（与摄像头同网段）
```

---

## 🔄 回滚方案

如果修复后出现问题，可以回滚到之前的版本：

```bash
# 1. 切换到修复前的版本
git checkout <previous-commit>

# 2. 重新构建
docker-compose build

# 3. 重启
docker-compose down
docker-compose up -d
```

或者手动修改 `docker-compose.yml`：

```yaml
services:
  backend:
    # 移除 network_mode
    # network_mode: "host"

    # 恢复 ports 和 networks
    ports:
      - "9888:9888"
    networks:
      - frigate-config-network

networks:
  frigate-config-network:
    driver: bridge
```

---

## 📞 获取帮助

### 日志查看

```bash
# 后端日志
docker logs frigate-config-deploy

# 前端日志
docker logs frigate-config-ui

# 实时跟踪日志
docker logs -f frigate-config-deploy
```

### 健康检查

```bash
# API 健康检查
curl http://10.10.0.129:9888/api/health

# 网络检测
curl http://10.10.0.129:9888/api/network/interfaces
```

### 报告问题

如果仍然遇到问题，请提供以下信息：

1. **环境信息**
   ```bash
   docker --version
   docker-compose --version
   uname -a
   ```

2. **网络信息**
   ```bash
   ip addr show
   ```

3. **容器日志**
   ```bash
   docker logs frigate-config-deploy > backend.log
   ```

4. **网络检测输出**
   ```bash
   curl http://10.10.0.129:9888/api/network/interfaces > network-info.json
   ```

提交到：https://github.com/SunvidWong/Frigate-Configuration-UI/issues

---

## ✅ 验收标准

修复成功的标准：

- [ ] WebUI 显示正确的宿主机 IP（10.10.0.129）
- [ ] 网络段正确（10.10.0.0/24）
- [ ] ONVIF 扫描可以发现局域网内的摄像头
- [ ] 一键部署功能正常工作
- [ ] Frigate 实例可以访问并显示摄像头画面

---

**文档版本**：v1.1
**最后更新**：2025-10-18
**修复编号**：FIX-001
