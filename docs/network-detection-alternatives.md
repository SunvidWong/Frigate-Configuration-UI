# 非 Host 模式下获取宿主机网络的方案

## 问题背景

在 Docker bridge 网络模式下，容器只能看到自己的内部网络（如 172.18.0.0/24），无法直接检测宿主机的物理网络（如 10.10.0.0/24）。这导致 ONVIF 扫描无法发现局域网内的摄像头。

当前使用 `network_mode: "host"` 解决，但有安全隐患。

---

## 方案对比

### 方案 1: 环境变量传递（最简单）

**实现方式**：
用户在 `docker-compose.yml` 中手动指定宿主机网络信息。

```yaml
services:
  backend:
    environment:
      - HOST_IP=10.10.0.129
      - HOST_NETWORK=10.10.0.0/24
      - HOST_INTERFACE=eth0
```

**后端代码**：
```python
import os

def get_host_network():
    """从环境变量获取宿主机网络"""
    host_ip = os.getenv('HOST_IP')
    host_network = os.getenv('HOST_NETWORK')

    if host_ip and host_network:
        return {
            'ip': host_ip,
            'network': host_network,
            'interface': os.getenv('HOST_INTERFACE', 'unknown')
        }

    # 降级：返回容器网络
    return get_container_network()
```

**优点**：
- ✅ 简单直接
- ✅ 用户完全可控
- ✅ 无需特殊权限

**缺点**：
- ❌ 需要用户手动配置
- ❌ 配置错误会导致功能失效
- ❌ 宿主机 IP 变化时需要手动更新

**适用场景**：静态 IP 环境

---

### 方案 2: 通过 Docker 网关推断（推荐）

**实现方式**：
通过访问 Docker bridge 网关（通常是宿主机 IP）来推断宿主机网络。

```python
import socket
import netifaces
import ipaddress
import requests

def get_host_network_via_gateway():
    """通过 Docker 网关推断宿主机网络"""

    # 1. 获取容器的默认网关（通常是宿主机在 Docker 网络中的 IP）
    gws = netifaces.gateways()
    default_gateway = gws['default'][netifaces.AF_INET][0]

    print(f"[INFO] Docker gateway: {default_gateway}")

    # 2. 尝试通过 Docker socket API 获取宿主机信息
    try:
        import docker
        client = docker.from_env()

        # 获取宿主机的网络配置
        networks = client.networks.list()

        for network in networks:
            if network.name == 'bridge' or 'bridge' in network.name:
                # 检查网络的 IPAM 配置
                ipam = network.attrs.get('IPAM', {})
                config = ipam.get('Config', [])

                for cfg in config:
                    gateway = cfg.get('Gateway')
                    subnet = cfg.get('Subnet')

                    if gateway and subnet:
                        print(f"[INFO] Bridge network: {subnet}, Gateway: {gateway}")

                        # 尝试从 gateway 推断宿主机网络
                        # 方法：访问宿主机的路由表或网络接口
                        host_network = detect_host_network_from_gateway(gateway)

                        if host_network:
                            return host_network

    except Exception as e:
        print(f"[WARN] Failed to detect via Docker API: {e}")

    # 3. 降级：使用默认网关作为提示
    return {
        'ip': default_gateway,
        'network': 'unknown',
        'interface': 'unknown',
        'note': '通过 Docker 网关推断，可能不准确'
    }


def detect_host_network_from_gateway(gateway_ip):
    """尝试从网关 IP 推断宿主机物理网络

    方法：
    1. 假设宿主机在同一网段
    2. 尝试扫描常见的私有网段
    """

    # 常见的私有网段
    common_subnets = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
    ]

    # 检查网关属于哪个网段
    gateway = ipaddress.IPv4Address(gateway_ip)

    for subnet in common_subnets:
        network = ipaddress.IPv4Network(subnet)

        if gateway in network:
            # 尝试进一步细化网段
            # 例如：如果网关是 172.17.0.1，可能的宿主机网络是 10.x.x.x

            # 方法：尝试 ARP 扫描邻居设备
            host_network = arp_scan_for_host_network()

            if host_network:
                return host_network

    return None


def arp_scan_for_host_network():
    """通过 ARP 扫描推断宿主机网络

    注意：需要 NET_ADMIN 权限
    """
    try:
        # 需要安装 scapy
        from scapy.all import ARP, Ether, srp

        # 扫描常见网段
        target_networks = [
            '10.10.0.0/24',
            '192.168.1.0/24',
            '192.168.0.0/24',
        ]

        for network in target_networks:
            arp = ARP(pdst=network)
            ether = Ether(dst="ff:ff:ff:ff:ff:ff")
            packet = ether/arp

            result = srp(packet, timeout=2, verbose=0)[0]

            if result:
                # 发现设备，说明这个网段是活跃的
                return {
                    'network': network,
                    'devices_found': len(result)
                }

        return None

    except ImportError:
        print("[WARN] scapy not installed, cannot perform ARP scan")
        return None
    except Exception as e:
        print(f"[WARN] ARP scan failed: {e}")
        return None
```

**优点**：
- ✅ 自动检测，无需用户配置
- ✅ 可以通过 Docker API 获取信息

**缺点**：
- ⚠️ 需要挂载 Docker socket
- ⚠️ 推断可能不准确
- ⚠️ ARP 扫描需要特权（NET_ADMIN）

**适用场景**：已经挂载 Docker socket 的场景

---

### 方案 3: macvlan 网络（最彻底）

**实现方式**：
使用 macvlan 网络模式，让容器获得独立的局域网 IP。

```yaml
# docker-compose.yml

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
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

**优点**：
- ✅ 容器直接在局域网中，与宿主机同网段
- ✅ 网络检测 100% 准确
- ✅ ONVIF 扫描完全正常

**缺点**：
- ❌ 配置复杂
- ❌ 需要了解网络知识
- ❌ 可能需要网络管理员权限
- ❌ 宿主机无法直接访问容器（需要额外配置）

**适用场景**：高级用户、企业环境

---

### 方案 4: HTTP API 探测（最灵活）

**实现方式**：
提供一个轻量级的"探测脚本"，运行在宿主机上，暴露一个 HTTP 端点给容器查询。

**宿主机探测脚本**（`host-network-probe.py`）：
```python
#!/usr/bin/env python3
"""
宿主机网络探测服务
在宿主机上运行，暴露网络信息给容器
"""

from flask import Flask, jsonify
import netifaces
import ipaddress

app = Flask(__name__)

@app.route('/network-info')
def get_network_info():
    """返回宿主机网络信息"""
    interfaces = []

    for iface in netifaces.interfaces():
        if iface == 'lo':
            continue

        addrs = netifaces.ifaddresses(iface)

        if netifaces.AF_INET in addrs:
            for addr in addrs[netifaces.AF_INET]:
                ip = addr.get('addr')
                netmask = addr.get('netmask')

                # 跳过 Docker 网络
                if ip.startswith('172.') or ip.startswith('169.254.'):
                    continue

                network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)

                interfaces.append({
                    'interface': iface,
                    'ip': ip,
                    'netmask': netmask,
                    'network': str(network)
                })

    return jsonify({
        'success': True,
        'interfaces': interfaces
    })

if __name__ == '__main__':
    # 监听在所有接口的 19999 端口
    app.run(host='0.0.0.0', port=19999)
```

**容器内调用**：
```python
import requests

def get_host_network_via_probe():
    """通过探测服务获取宿主机网络"""

    # 通过 Docker 网关访问宿主机
    gateway = netifaces.gateways()['default'][netifaces.AF_INET][0]
    probe_url = f"http://{gateway}:19999/network-info"

    try:
        response = requests.get(probe_url, timeout=5)
        data = response.json()

        if data.get('success'):
            interfaces = data.get('interfaces', [])

            # 优先返回 10.x 或 192.168.x 网段
            for iface in interfaces:
                ip = iface['ip']
                if ip.startswith('10.') or ip.startswith('192.168.'):
                    return iface

            # 返回第一个
            if interfaces:
                return interfaces[0]

        return None

    except Exception as e:
        print(f"[WARN] Failed to probe host network: {e}")
        return None
```

**docker-compose.yml**：
```yaml
services:
  # 宿主机网络探测服务
  host-network-probe:
    image: python:3.11-slim
    container_name: host-network-probe
    network_mode: "host"
    volumes:
      - ./host-network-probe.py:/app/probe.py
    command: python /app/probe.py
    restart: unless-stopped

  # 配置 UI（可以访问探测服务）
  backend:
    image: frigate-config-backend:latest
    container_name: frigate-config-backend
    ports:
      - "9888:9888"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - host-network-probe
```

**优点**：
- ✅ 容器可以使用 bridge 网络（更安全）
- ✅ 网络信息准确
- ✅ 探测服务可以单独部署

**缺点**：
- ⚠️ 需要额外的探测服务
- ⚠️ 增加部署复杂度
- ⚠️ 探测服务仍需 host 网络

**适用场景**：需要安全隔离，但又要准确网络信息

---

## 推荐方案总结

| 方案 | 复杂度 | 准确度 | 安全性 | 推荐场景 |
|------|--------|--------|--------|----------|
| 环境变量 | ⭐ | ⭐⭐ | ⭐⭐⭐ | 静态 IP 环境 |
| Docker 网关推断 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 已挂载 Docker socket |
| macvlan 网络 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 高级用户 |
| HTTP 探测 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 需要隔离 |
| **host 模式（当前）** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐ | 快速部署 |

---

## 实施建议

### 短期方案（v1.0）
继续使用 `network_mode: "host"`，并在文档中说明安全注意事项。

**理由**：
- 配置最简单
- 功能 100% 可用
- 适合大多数家庭/小型企业用户

### 中期方案（v1.1）
添加**方案 1（环境变量）** 作为备选。

```yaml
services:
  backend:
    # 优先使用 host 模式
    network_mode: "host"

    # 如果不能用 host 模式，提供环境变量配置
    environment:
      - HOST_IP=${HOST_IP:-auto}
      - HOST_NETWORK=${HOST_NETWORK:-auto}
```

### 长期方案（v2.0）
实现**方案 2（Docker 网关推断）** + **方案 4（HTTP 探测）** 的混合方案。

**自动检测逻辑**：
```python
def get_network_info():
    # 1. 尝试直接检测（host 模式）
    network = detect_network_directly()
    if network and not network['ip'].startswith('172.'):
        return network

    # 2. 尝试环境变量
    network = get_network_from_env()
    if network:
        return network

    # 3. 尝试 HTTP 探测
    network = get_network_via_probe()
    if network:
        return network

    # 4. 尝试 Docker 网关推断
    network = get_network_via_gateway()
    if network:
        return network

    # 5. 降级：提示用户手动配置
    return {
        'error': 'Cannot detect host network',
        'suggestion': 'Please configure HOST_IP and HOST_NETWORK'
    }
```

---

## 用户配置示例

### 配置 1: Host 模式（推荐）
```yaml
services:
  frigate-config-backend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui:latest
    network_mode: "host"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### 配置 2: Bridge 模式 + 环境变量
```yaml
services:
  frigate-config-backend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui:latest
    ports:
      - "9888:9888"
    environment:
      - HOST_IP=10.10.0.129
      - HOST_NETWORK=10.10.0.0/24
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### 配置 3: macvlan 网络（高级）
```yaml
networks:
  lan:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 10.10.0.0/24
          gateway: 10.10.0.1
          ip_range: 10.10.0.128/25

services:
  frigate-config-backend:
    image: ghcr.io/sunvidwong/frigate-configuration-ui:latest
    networks:
      lan:
        ipv4_address: 10.10.0.130
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

---

## 结论

**当前版本（v1.0）**：
- 使用 `network_mode: "host"`
- 在文档中说明安全注意事项
- 提供防火墙配置建议

**下一版本（v1.1）**：
- 添加环境变量配置选项
- 提供多种部署方式文档

**未来版本（v2.0）**：
- 实现自动网络检测（多种方案降级）
- 支持 macvlan 网络模式
- 提供网络诊断工具
