import { useState, useEffect } from 'react';
import type { DDNSConfig, SSLCertificate, PortForwarding, RemoteAccessConfig } from '../types/remote';

// 模拟数据
const mockRemoteConfig: RemoteAccessConfig = {
  ddns: {
    provider: 'cloudflare',
    domain: 'example.com',
    subdomain: 'frigate',
    enabled: false,
    lastUpdate: undefined
  },
  ssl: {
    enabled: false,
    forceHttps: false
  },
  portForwarding: [
    {
      internalPort: 5000,
      externalPort: 80,
      protocol: 'tcp',
      enabled: true,
      description: 'Web界面'
    },
    {
      internalPort: 1984,
      externalPort: 1984,
      protocol: 'tcp',
      enabled: true,
      description: 'go2rtc流媒体'
    },
    {
      internalPort: 5550,
      externalPort: 5550,
      protocol: 'tcp',
      enabled: false,
      description: '备用Web界面'
    }
  ],
  accessControl: {
    enabled: false,
    allowedIPs: [],
    authentication: false
  }
};

export function useRemoteAccess() {
  const [config, setConfig] = useState<RemoteAccessConfig>(mockRemoteConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载远程访问配置
  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConfig(mockRemoteConfig);
    } catch (err) {
      setError('加载远程访问配置失败');
      console.error('Failed to load remote config:', err);
    } finally {
      setLoading(false);
    }
  };

  // 更新DDNS配置
  const updateDDNSConfig = async (ddnsConfig: Partial<DDNSConfig>) => {
    try {
      const newConfig = {
        ...config,
        ddns: { ...config.ddns, ...ddnsConfig, lastUpdate: new Date() }
      };
      setConfig(newConfig);
    } catch (err) {
      setError('更新DDNS配置失败');
      throw err;
    }
  };

  // 测试DDNS连接
  const testDDNSConnection = async (_ddnsConfig: DDNSConfig): Promise<boolean> => {
    try {
      // 模拟连接测试
      await new Promise(resolve => setTimeout(resolve, 2000));
      return Math.random() > 0.3; // 70% 成功率
    } catch (err) {
      return false;
    }
  };

  // 更新SSL配置
  const updateSSLConfig = async (sslConfig: Partial<typeof config.ssl>) => {
    try {
      const newConfig = {
        ...config,
        ssl: { ...config.ssl, ...sslConfig }
      };
      setConfig(newConfig);
    } catch (err) {
      setError('更新SSL配置失败');
      throw err;
    }
  };

  // 生成自签名证书
  const generateSelfSignedCert = async (domain: string): Promise<SSLCertificate> => {
    try {
      // 模拟证书生成
      await new Promise(resolve => setTimeout(resolve, 3000));

      const now = new Date();
      const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年有效期

      return {
        id: Date.now().toString(),
        domain,
        issuer: 'Self-Signed',
        validFrom: now,
        validUntil,
        status: 'valid' as const,
        autoRenew: false
      };
    } catch (err) {
      setError('生成自签名证书失败');
      throw err;
    }
  };

  // 申请Let's Encrypt证书
  const installLetsEncrypt = async (domain: string, _email: string): Promise<SSLCertificate> => {
    try {
      // 模拟Let's Encrypt申请
      await new Promise(resolve => setTimeout(resolve, 5000));

      const now = new Date();
      const validUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90天有效期

      return {
        id: Date.now().toString(),
        domain,
        issuer: "Let's Encrypt",
        validFrom: now,
        validUntil,
        status: 'valid' as const,
        autoRenew: true
      };
    } catch (err) {
      setError('申请Let\'s Encrypt证书失败');
      throw err;
    }
  };

  // 更新端口转发
  const updatePortForwarding = async (portForwarding: PortForwarding[]) => {
    try {
      const newConfig = {
        ...config,
        portForwarding
      };
      setConfig(newConfig);
    } catch (err) {
      setError('更新端口转发配置失败');
      throw err;
    }
  };

  // 更新访问控制
  const updateAccessControl = async (accessControl: Partial<typeof config.accessControl>) => {
    try {
      const newConfig = {
        ...config,
        accessControl: { ...config.accessControl, ...accessControl }
      };
      setConfig(newConfig);
    } catch (err) {
      setError('更新访问控制配置失败');
      throw err;
    }
  };

  // 保存配置
  const saveConfig = async (): Promise<void> => {
    try {
      // 模拟保存到后端
      await new Promise(resolve => setTimeout(resolve, 1500));
      setError(null);
    } catch (err) {
      setError('保存配置失败');
      throw err;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    loadConfig,
    updateDDNSConfig,
    testDDNSConnection,
    updateSSLConfig,
    generateSelfSignedCert,
    installLetsEncrypt,
    updatePortForwarding,
    updateAccessControl,
    saveConfig
  };
}