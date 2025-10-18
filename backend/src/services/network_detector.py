"""
网络检测服务

在 host 网络模式下，可以正确检测宿主机网络接口。
用于 ONVIF 设备扫描时确定正确的网络段。

修复问题 #FIX-001: Docker 模式下网络检测错误
"""

import netifaces
import ipaddress
from typing import List, Dict, Optional


def get_network_interfaces() -> List[Dict]:
    """
    获取所有网络接口信息

    Returns:
        [
            {
                'interface': 'eth0',
                'ip': '10.10.0.129',
                'netmask': '255.255.255.0',
                'network': '10.10.0.0/24',
                'is_default': True
            },
            ...
        ]
    """
    interfaces = []

    try:
        all_ifaces = netifaces.interfaces()
    except Exception as e:
        print(f"[ERROR] Failed to get network interfaces: {e}")
        return []

    for iface in all_ifaces:
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
                        print(f"[DEBUG] Skipping Docker internal network: {ip}")
                        continue

                    # 跳过 169.254.x.x（APIPA - Automatic Private IP Addressing）
                    if ip.startswith('169.254.'):
                        continue

                    # 计算网络地址
                    try:
                        network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)

                        interfaces.append({
                            'interface': iface,
                            'ip': ip,
                            'netmask': netmask,
                            'network': str(network),
                            'is_default': False  # 稍后标记默认网络
                        })

                        print(f"[INFO] Detected network interface: {iface} - {ip}/{network}")

                    except ValueError as e:
                        print(f"[WARN] Invalid network address {ip}/{netmask}: {e}")
                        pass

        except Exception as e:
            print(f"[WARN] Failed to get info for interface {iface}: {e}")
            continue

    # 标记默认网络
    if interfaces:
        default_iface = _find_default_interface(interfaces)
        if default_iface:
            for iface in interfaces:
                if iface['interface'] == default_iface['interface']:
                    iface['is_default'] = True

    return interfaces


def _find_default_interface(interfaces: List[Dict]) -> Optional[Dict]:
    """
    查找默认网络接口

    优先级：
    1. 10.x.x.x 网段（企业网络）
    2. 192.168.x.x 网段（家庭网络）
    3. 其他私有网段
    4. 第一个接口
    """
    if not interfaces:
        return None

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


def get_default_network() -> Dict:
    """
    获取默认网络接口（用于 ONVIF 扫描）

    Returns:
        {
            'interface': 'eth0',
            'ip': '10.10.0.129',
            'netmask': '255.255.255.0',
            'network': '10.10.0.0/24'
        }
    """
    interfaces = get_network_interfaces()

    if not interfaces:
        print("[WARN] No network interfaces found, returning localhost")
        return {
            'interface': 'lo',
            'ip': '127.0.0.1',
            'netmask': '255.0.0.0',
            'network': '127.0.0.0/8'
        }

    # 查找标记为默认的接口
    for iface in interfaces:
        if iface.get('is_default'):
            return iface

    # 如果没有标记默认，返回第一个
    return interfaces[0]


def is_same_network(ip1: str, ip2: str, netmask: str) -> bool:
    """
    判断两个 IP 是否在同一网段

    Args:
        ip1: 第一个 IP 地址
        ip2: 第二个 IP 地址
        netmask: 子网掩码（如 255.255.255.0）

    Returns:
        bool: 是否在同一网段

    Example:
        >>> is_same_network('10.10.0.129', '10.10.0.100', '255.255.255.0')
        True
        >>> is_same_network('10.10.0.129', '10.10.1.100', '255.255.255.0')
        False
    """
    try:
        network = ipaddress.IPv4Network(f"{ip1}/{netmask}", strict=False)
        ip2_obj = ipaddress.IPv4Address(ip2)
        return ip2_obj in network
    except ValueError:
        return False


def calculate_broadcast(ip: str, netmask: str) -> str:
    """
    计算广播地址

    Args:
        ip: IP 地址
        netmask: 子网掩码

    Returns:
        str: 广播地址

    Example:
        >>> calculate_broadcast('10.10.0.129', '255.255.255.0')
        '10.10.0.255'
    """
    try:
        network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
        return str(network.broadcast_address)
    except ValueError:
        return ip


def get_network_info_for_onvif() -> Dict:
    """
    获取用于 ONVIF 扫描的网络信息

    Returns:
        {
            'ip': '10.10.0.129',
            'network': '10.10.0.0/24',
            'broadcast': '10.10.0.255',
            'interface': 'eth0'
        }
    """
    default = get_default_network()

    broadcast = calculate_broadcast(default['ip'], default['netmask'])

    return {
        'ip': default['ip'],
        'network': default['network'],
        'broadcast': broadcast,
        'interface': default['interface']
    }


# 测试代码
if __name__ == "__main__":
    print("=== 网络接口检测 ===")

    interfaces = get_network_interfaces()
    print(f"\n找到 {len(interfaces)} 个网络接口：")

    for iface in interfaces:
        default_tag = " [默认]" if iface.get('is_default') else ""
        print(f"  {iface['interface']}: {iface['ip']} ({iface['network']}){default_tag}")

    print("\n=== 默认网络 ===")
    default = get_default_network()
    print(f"  接口: {default['interface']}")
    print(f"  IP: {default['ip']}")
    print(f"  网络: {default['network']}")

    print("\n=== ONVIF 扫描网络信息 ===")
    onvif_info = get_network_info_for_onvif()
    print(f"  IP: {onvif_info['ip']}")
    print(f"  网络: {onvif_info['network']}")
    print(f"  广播: {onvif_info['broadcast']}")
    print(f"  接口: {onvif_info['interface']}")
