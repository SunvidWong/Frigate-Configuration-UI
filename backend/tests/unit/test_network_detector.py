"""
网络检测服务测试

测试 network_detector.py 的功能
"""

import pytest
from unittest.mock import patch, MagicMock

from src.services.network_detector import (
    get_network_interfaces,
    get_default_network,
    is_same_network,
    calculate_broadcast,
    get_network_info_for_onvif,
    _find_default_interface
)


def test_is_same_network():
    """测试 IP 是否在同一网段判断"""

    # 相同网段
    assert is_same_network('10.10.0.129', '10.10.0.100', '255.255.255.0') is True
    assert is_same_network('192.168.1.100', '192.168.1.200', '255.255.255.0') is True

    # 不同网段
    assert is_same_network('10.10.0.129', '10.10.1.100', '255.255.255.0') is False
    assert is_same_network('192.168.1.100', '192.168.2.100', '255.255.255.0') is False

    # 更大的子网
    assert is_same_network('10.10.0.129', '10.10.1.100', '255.255.0.0') is True


def test_calculate_broadcast():
    """测试广播地址计算"""

    # 标准 /24 网络
    assert calculate_broadcast('10.10.0.129', '255.255.255.0') == '10.10.0.255'
    assert calculate_broadcast('192.168.1.100', '255.255.255.0') == '192.168.1.255'

    # /16 网络
    assert calculate_broadcast('10.10.0.129', '255.255.0.0') == '10.10.255.255'


def test_find_default_interface():
    """测试默认接口选择逻辑"""

    # 测试数据：包含 10.x 和 192.168.x 网段
    interfaces = [
        {'interface': 'eth0', 'ip': '192.168.1.100', 'netmask': '255.255.255.0', 'network': '192.168.1.0/24'},
        {'interface': 'eth1', 'ip': '10.10.0.129', 'netmask': '255.255.255.0', 'network': '10.10.0.0/24'},
    ]

    # 应该优先选择 10.x 网段
    default = _find_default_interface(interfaces)
    assert default['interface'] == 'eth1'
    assert default['ip'] == '10.10.0.129'

    # 测试数据：只有 192.168.x 网段
    interfaces = [
        {'interface': 'eth0', 'ip': '192.168.1.100', 'netmask': '255.255.255.0', 'network': '192.168.1.0/24'},
    ]

    default = _find_default_interface(interfaces)
    assert default['interface'] == 'eth0'
    assert default['ip'] == '192.168.1.100'

    # 测试数据：空列表
    interfaces = []
    default = _find_default_interface(interfaces)
    assert default is None


@patch('src.services.network_detector.netifaces')
def test_get_network_interfaces_filters_docker_networks(mock_netifaces):
    """测试过滤 Docker 内部网络"""

    # 模拟 netifaces 返回
    mock_netifaces.interfaces.return_value = ['lo', 'eth0', 'docker0']

    mock_netifaces.AF_INET = 2

    # 模拟每个接口的地址
    def mock_ifaddresses(iface):
        if iface == 'lo':
            return {2: [{'addr': '127.0.0.1', 'netmask': '255.0.0.0'}]}
        elif iface == 'eth0':
            return {2: [{'addr': '10.10.0.129', 'netmask': '255.255.255.0'}]}
        elif iface == 'docker0':
            return {2: [{'addr': '172.18.0.1', 'netmask': '255.255.0.0'}]}
        return {}

    mock_netifaces.ifaddresses = mock_ifaddresses

    # 获取网络接口
    interfaces = get_network_interfaces()

    # 应该过滤掉 lo 和 docker0
    assert len(interfaces) == 1
    assert interfaces[0]['interface'] == 'eth0'
    assert interfaces[0]['ip'] == '10.10.0.129'
    assert '172.18' not in interfaces[0]['ip']  # 确认没有 Docker 网络


@patch('src.services.network_detector.netifaces')
def test_get_default_network(mock_netifaces):
    """测试获取默认网络"""

    # 模拟 netifaces 返回
    mock_netifaces.interfaces.return_value = ['eth0']
    mock_netifaces.AF_INET = 2

    def mock_ifaddresses(iface):
        if iface == 'eth0':
            return {2: [{'addr': '10.10.0.129', 'netmask': '255.255.255.0'}]}
        return {}

    mock_netifaces.ifaddresses = mock_ifaddresses

    # 获取默认网络
    default = get_default_network()

    assert default['interface'] == 'eth0'
    assert default['ip'] == '10.10.0.129'
    assert default['network'] == '10.10.0.0/24'


@patch('src.services.network_detector.netifaces')
def test_get_network_info_for_onvif(mock_netifaces):
    """测试获取 ONVIF 扫描网络信息"""

    # 模拟 netifaces 返回
    mock_netifaces.interfaces.return_value = ['eth0']
    mock_netifaces.AF_INET = 2

    def mock_ifaddresses(iface):
        if iface == 'eth0':
            return {2: [{'addr': '10.10.0.129', 'netmask': '255.255.255.0'}]}
        return {}

    mock_netifaces.ifaddresses = mock_ifaddresses

    # 获取 ONVIF 扫描信息
    info = get_network_info_for_onvif()

    assert info['ip'] == '10.10.0.129'
    assert info['network'] == '10.10.0.0/24'
    assert info['broadcast'] == '10.10.0.255'
    assert info['interface'] == 'eth0'


def test_get_default_network_when_no_interfaces():
    """测试没有网络接口时的处理"""

    with patch('src.services.network_detector.netifaces') as mock_netifaces:
        mock_netifaces.interfaces.return_value = ['lo']  # 只有回环
        mock_netifaces.AF_INET = 2

        def mock_ifaddresses(iface):
            if iface == 'lo':
                return {2: [{'addr': '127.0.0.1', 'netmask': '255.0.0.0'}]}
            return {}

        mock_netifaces.ifaddresses = mock_ifaddresses

        # 获取默认网络（应该返回 localhost）
        default = get_default_network()

        assert default['interface'] == 'lo'
        assert default['ip'] == '127.0.0.1'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
