# 修复提案：Docker 模式下的网络和部署问题

**问题编号**：#001
**创建时间**：2025-10-18
**严重程度**：高（影响核心功能）
**状态**：待修复

---

## 🐛 问题描述

### 问题 1：硬件扫描功能在 Docker 模式下不可用
**现象**：
```
硬件扫描功能仅在桌面模式下可用。
在 Docker 模式下，请使用"手动添加"功能来配置硬件加速器。
```

**影响**：用户无法自动检测 GPU/NPU 硬件

---

### 问题 2：一键部署功能在 Docker 模式下不可用
**现象**：
```
一键部署功能仅在桌面模式下可用。
在 Docker 模式下，请下载生成的 docker-compose.yml 文件，
然后在宿主机上手动运行：docker-compose up -d
```

**影响**：用户无法通过 WebUI 直接部署实例

---

### 问题 3：网络检测错误
**现象**：
```
自动检测到的网络：
eth0 默认
172.18.0.2 172.18.0.0/24
```

**根本原因**：
- 检测到的是 **Docker 容器内部网络**（172.18.0.0/24）
- 而不是 **宿主机局域网**（应该是 10.10.0.0/24）

**影响**：
- ONVIF 扫描会在错误的网络段进行
- 无法发现局域网内的摄像头
- 扫描摄像头失败

---

## 🔍 根本原因分析

### 1. 网络命名空间隔离

Docker 容器默认运行在独立的网络命名空间中：

```
┌─────────────────────────────────────┐
│ 宿主机 (10.10.0.129)                │
│  ├─ 物理网卡: 10.10.0.0/24          │
│  └─ Docker 网络                     │
│      └─ frigate-config (容器)       │
│          └─ eth0: 172.18.0.2/24     │  ← 容器内看到的网络
└─────────────────────────────────────┘

摄像头在: 10.10.0.0/24  ← 与容器不在同一网段！
```

### 2. 当前实现的局限

**后端网络检测代码问题**：
```python
# 当前实现（简化）
def get_network_interfaces():
    # 这会返回容器内部的网络接口
    interfaces = netifaces.interfaces()
    # 返回 172.18.0.2/24 (错误！)
```

**问题**：
- 代码运行在容器内部
- 只能看到容器的虚拟网络
- 看不到宿主机的物理网络

---

## 💡 解决方案

### 方案 A：使用 Host 网络模式（推荐）

#### 优点
- ✅ 容器直接使用宿主机网络
- ✅ 可以正确检测宿主机 IP
- ✅ ONVIF 扫描可以发现局域网设备
- ✅ 无需额外配置

#### 缺点
- ⚠️ 端口冲突风险增加
- ⚠️ 安全隔离性降低

#### 实施步骤

**1. 修改 docker-compose.yml**

```yaml
# docker/docker-compose.yml

services:
  backend:
    container_name: frigate-config-deploy
    image: frigate-config-backend:latest
    network_mode: "host"  # ← 添加这行
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ../data:/data
    environment:
      - WEB_PORT=9888
      - TZ=UTC
    restart: "no"

  frontend:
    container_name: frigate-config-frontend
    image: frigate-config-frontend:latest
    network_mode: "host"  # ← 添加这行
    depends_on:
      - backend
```

**2. 验证网络检测**

重启容器后，网络检测应该返回：
```
自动检测到的网络：
eth0 默认
10.10.0.129 10.10.0.0/24  ← 正确的宿主机网络
```

---

### 方案 B：通过环境变量指定宿主机网络（备选）

#### 优点
- ✅ 保持网络隔离
- ✅ 手动指定网络段

#### 缺点
- ⚠️ 需要用户手动配置
- ⚠️ 部署复杂度增加

#### 实施步骤

**1. 添加环境变量配置**

```yaml
# docker/docker-compose.yml

services:
  backend:
    environment:
      - HOST_NETWORK=10.10.0.0/24  # ← 手动指定宿主机网络段
      - HOST_IP=10.10.0.129        # ← 手动指定宿主机 IP
```

**2. 修改后端网络检测代码**

```python
# backend/src/services/network_detector.py

import os

def get_host_network():
    """获取宿主机网络信息"""

    # 优先使用环境变量
    host_network = os.getenv('HOST_NETWORK')
    host_ip = os.getenv('HOST_IP')

    if host_network and host_ip:
        return {
            'interface': 'host',
            'ip': host_ip,
            'network': host_network
        }

    # 否则检测容器网络（可能不准确）
    return get_container_network()
```

**3. 用户需要手动配置**

修改 `docker-compose.yml`：
```yaml
environment:
  - HOST_NETWORK=10.10.0.0/24  # 替换为你的局域网段
  - HOST_IP=10.10.0.129        # 替换为宿主机 IP
```

---

### 方案 C：使用 macvlan 网络（高级）

#### 优点
- ✅ 容器获得独立的局域网 IP
- ✅ 与宿主机同网段

#### 缺点
- ⚠️ 配置复杂
- ⚠️ 需要网络管理员权限

#### 实施步骤

```yaml
# docker/docker-compose.yml

networks:
  lan:
    driver: macvlan
    driver_opts:
      parent: eth0  # 宿主机物理网卡
    ipam:
      config:
        - subnet: 10.10.0.0/24
          gateway: 10.10.0.1
          ip_range: 10.10.0.128/25  # 为容器预留的 IP 范围

services:
  backend:
    networks:
      lan:
        ipv4_address: 10.10.0.130  # 容器固定 IP
```

---

## 🎯 推荐方案：方案 A（Host 网络模式）

### 理由

1. **最简单**：只需修改一行配置
2. **最有效**：彻底解决网络检测问题
3. **最适合本项目**：配置 UI 工具需要访问宿主机网络

### 实施计划

#### 阶段 1：修复网络检测（立即）

**文件**：`docker/docker-compose.yml`

```yaml
services:
  backend:
    network_mode: "host"
    # 移除 ports 配置（host 模式不需要）
    # ports:
    #   - "9888:9888"

  frontend:
    network_mode: "host"
    # 移除 ports 配置
    # ports:
    #   - "80:80"
```

**文件**：`backend/src/services/network_detector.py`

```python
def get_network_interfaces():
    """
    获取网络接口信息

    注意：在 host 网络模式下，可以正确检测宿主机网络
    """
    import netifaces

    interfaces = []

    for iface in netifaces.interfaces():
        # 跳过回环接口
        if iface == 'lo':
            continue

        addrs = netifaces.ifaddresses(iface)

        # 获取 IPv4 地址
        if netifaces.AF_INET in addrs:
            for addr in addrs[netifaces.AF_INET]:
                ip = addr.get('addr')
                netmask = addr.get('netmask')

                # 跳过 Docker 内部网络
                if ip.startswith('172.'):
                    continue

                interfaces.append({
                    'interface': iface,
                    'ip': ip,
                    'netmask': netmask,
                    'network': calculate_network(ip, netmask)
                })

    return interfaces
```

#### 阶段 2：启用硬件扫描（可选）

**文件**：`backend/src/services/hardware_detector.py`

```python
def detect_nvidia_gpu():
    """检测 NVIDIA GPU（host 网络模式下可用）"""
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            gpu_names = result.stdout.strip().split('\n')
            return [{'name': name, 'type': 'nvidia'} for name in gpu_names]
    except:
        pass

    return []

def detect_hailo_npu():
    """检测 Hailo NPU"""
    hailo_devices = []

    # 检查 /dev/hailo* 设备
    for device in Path('/dev').glob('hailo*'):
        hailo_devices.append({
            'name': device.name,
            'type': 'hailo',
            'path': str(device)
        })

    return hailo_devices
```

#### 阶段 3：启用一键部署（Docker SDK）

**文件**：`backend/src/services/deployment_service.py`

保持现有实现，host 网络模式下 Docker SDK 可以正常工作。

---

## 📋 测试清单

### 测试 1：网络检测修复验证

**步骤**：
```bash
# 1. 更新配置
cd docker
vim docker-compose.yml  # 添加 network_mode: "host"

# 2. 重启容器
docker-compose down
docker-compose up -d

# 3. 访问 WebUI
open http://10.10.0.129:9888

# 4. 查看网络检测结果
```

**预期结果**：
```
自动检测到的网络：
eth0 默认
10.10.0.129 10.10.0.0/24  ← 正确显示宿主机网络
```

---

### 测试 2：ONVIF 扫描验证

**步骤**：
```
1. 进入向导步骤 2（摄像头配置）
2. 选择"ONVIF 扫描"
3. 输入摄像头用户名/密码
4. 点击"扫描局域网设备"
```

**预期结果**：
- ✅ 发现局域网内的摄像头（10.10.0.x）
- ✅ 显示摄像头信息（品牌、型号、IP）

---

### 测试 3：一键部署验证

**步骤**：
```
1. 完成三步向导
2. 点击"一键部署"
3. 等待部署完成
```

**预期结果**：
- ✅ 容器创建成功
- ✅ 端口映射正确
- ✅ 可以访问 Frigate UI (http://10.10.0.129:5200)

---

## 🔧 代码修改清单

### 文件 1：`docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    container_name: frigate-config-deploy
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    network_mode: "host"  # ← 添加
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ../data:/data
      - ../backend:/app/backend
    environment:
      - WEB_PORT=9888
      - TZ=UTC
      - PYTHONUNBUFFERED=1
    restart: "no"
    # 移除 ports（host 模式不需要）

  frontend:
    container_name: frigate-config-frontend
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    network_mode: "host"  # ← 添加
    depends_on:
      - backend
    # 移除 ports
```

### 文件 2：`backend/src/services/network_detector.py`（新增）

```python
"""
网络检测服务

在 host 网络模式下，可以正确检测宿主机网络接口
"""

import netifaces
import ipaddress
from typing import List, Dict


def get_network_interfaces() -> List[Dict]:
    """
    获取所有网络接口信息

    Returns:
        [
            {
                'interface': 'eth0',
                'ip': '10.10.0.129',
                'netmask': '255.255.255.0',
                'network': '10.10.0.0/24'
            },
            ...
        ]
    """
    interfaces = []

    for iface in netifaces.interfaces():
        # 跳过回环接口
        if iface == 'lo':
            continue

        try:
            addrs = netifaces.ifaddresses(iface)

            # 获取 IPv4 地址
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    ip = addr.get('addr')
                    netmask = addr.get('netmask')

                    if not ip or not netmask:
                        continue

                    # 跳过 Docker 内部网络（172.x.x.x）
                    if ip.startswith('172.'):
                        continue

                    # 跳过 169.254.x.x（APIPA）
                    if ip.startswith('169.254.'):
                        continue

                    # 计算网络地址
                    try:
                        network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)

                        interfaces.append({
                            'interface': iface,
                            'ip': ip,
                            'netmask': netmask,
                            'network': str(network)
                        })
                    except ValueError:
                        pass

        except Exception as e:
            print(f"Warning: Failed to get info for interface {iface}: {e}")
            continue

    return interfaces


def get_default_network() -> Dict:
    """
    获取默认网络接口（用于 ONVIF 扫描）

    优先级：
    1. 10.x.x.x 网段（常见的企业网络）
    2. 192.168.x.x 网段（常见的家庭网络）
    3. 其他私有网段
    """
    interfaces = get_network_interfaces()

    if not interfaces:
        return {
            'interface': 'unknown',
            'ip': '127.0.0.1',
            'network': '127.0.0.0/8'
        }

    # 优先选择 10.x 网段
    for iface in interfaces:
        if iface['ip'].startswith('10.'):
            return iface

    # 其次选择 192.168.x 网段
    for iface in interfaces:
        if iface['ip'].startswith('192.168.'):
            return iface

    # 最后返回第一个
    return interfaces[0]


def is_same_network(ip1: str, ip2: str, netmask: str) -> bool:
    """
    判断两个 IP 是否在同一网段

    Args:
        ip1: 第一个 IP 地址
        ip2: 第二个 IP 地址
        netmask: 子网掩码

    Returns:
        bool: 是否在同一网段
    """
    try:
        network = ipaddress.IPv4Network(f"{ip1}/{netmask}", strict=False)
        ip2_obj = ipaddress.IPv4Address(ip2)
        return ip2_obj in network
    except ValueError:
        return False
```

### 文件 3：`backend/src/api/network.py`（新增）

```python
"""
网络相关 API
"""

from fastapi import APIRouter
from typing import List, Dict

from ..services.network_detector import get_network_interfaces, get_default_network


router = APIRouter(prefix="/api/network", tags=["network"])


@router.get("/interfaces")
async def list_network_interfaces() -> Dict:
    """
    获取所有网络接口

    Returns:
        {
            "interfaces": [
                {
                    "interface": "eth0",
                    "ip": "10.10.0.129",
                    "netmask": "255.255.255.0",
                    "network": "10.10.0.0/24"
                }
            ],
            "default": {
                "interface": "eth0",
                "ip": "10.10.0.129",
                "network": "10.10.0.0/24"
            }
        }
    """
    interfaces = get_network_interfaces()
    default = get_default_network()

    return {
        "interfaces": interfaces,
        "default": default
    }
```

### 文件 4：`backend/requirements.txt`

添加依赖：
```
netifaces==0.11.0
```

---

## 📊 影响评估

### 兼容性影响
- ✅ **向后兼容**：现有实例不受影响
- ⚠️ **端口绑定**：host 模式下端口直接绑定到宿主机
- ✅ **Docker API**：Docker SDK 仍然正常工作

### 安全影响
- ⚠️ **网络隔离降低**：容器可以访问宿主机所有网络
- ✅ **可控范围**：仅配置 UI 容器使用 host 模式
- ✅ **Frigate 实例**：仍然使用 bridge 网络（隔离）

---

## 🚀 实施时间线

### 第 1 天：紧急修复（2-4 小时）
- [x] 修改 docker-compose.yml（添加 host 网络模式）
- [x] 添加 network_detector.py
- [x] 添加 network API
- [x] 更新 requirements.txt

### 第 2 天：测试验证（4-6 小时）
- [ ] 本地测试网络检测
- [ ] 测试 ONVIF 扫描
- [ ] 测试一键部署
- [ ] 编写集成测试

### 第 3 天：文档更新（2-3 小时）
- [ ] 更新 README.md
- [ ] 更新 user-guide.md
- [ ] 添加故障排查章节

---

## ✅ 验收标准

### 标准 1：网络检测正确
- [ ] WebUI 显示正确的宿主机 IP（10.10.0.129）
- [ ] WebUI 显示正确的网络段（10.10.0.0/24）
- [ ] 不显示 Docker 内部网络（172.18.0.0/24）

### 标准 2：ONVIF 扫描成功
- [ ] 可以发现局域网内的摄像头
- [ ] 显示正确的摄像头信息
- [ ] 可以获取流 profiles

### 标准 3：一键部署成功
- [ ] 可以通过 WebUI 部署实例
- [ ] 容器创建成功
- [ ] 可以访问 Frigate UI

---

## 📞 需要帮助？

如有疑问，请联系：
- GitHub Issue: https://github.com/SunvidWong/Frigate-Configuration-UI/issues
- 文档: `docs/user-guide.md`

---

**提案编号**：FIX-001
**创建人**：Claude (AI Assistant)
**创建时间**：2025-10-18
**优先级**：高
**状态**：待实施
