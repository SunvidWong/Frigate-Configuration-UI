import { useEffect, useState } from 'react';
import { Globe, Shield, Key, RefreshCw, AlertTriangle, Save, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useRemoteAccess } from '../hooks/useRemoteAccess';
import { Button } from '../components/common/Button';
import type { DDNSConfig } from '../types/remote';

export default function RemoteAccess() {
  const { dispatch } = useAppContext();
  const {
    config,
    error,
    updateDDNSConfig,
    testDDNSConnection,
    updateSSLConfig,
    generateSelfSignedCert,
    installLetsEncrypt,
    updatePortForwarding,
    updateAccessControl,
    saveConfig
  } = useRemoteAccess();

  const [testingDDNS, setTestingDDNS] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [ddnsTestResult, setDdnsTestResult] = useState<boolean | null>(null);
  const [certEmail, setCertEmail] = useState('admin@example.com');
  const [, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(actions.setCurrentPage('remote'));
  }, [dispatch]);

  const handleTestDDNS = async () => {
    setTestingDDNS(true);
    setDdnsTestResult(null);

    try {
      const result = await testDDNSConnection(config.ddns);
      setDdnsTestResult(result);
    } catch (error) {
      setDdnsTestResult(false);
    } finally {
      setTestingDDNS(false);
    }
  };

  const handleGenerateSelfSignedCert = async () => {
    if (!config.ddns.domain) {
      setLocalError('请先配置域名');
      return;
    }

    setGeneratingCert(true);
    try {
      const cert = await generateSelfSignedCert(config.ddns.domain);
      await updateSSLConfig({
        enabled: true,
        certificate: cert
      });
    } catch (error) {
      console.error('Failed to generate self-signed cert:', error);
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleInstallLetsEncrypt = async () => {
    if (!config.ddns.domain) {
      setLocalError('请先配置域名');
      return;
    }

    setGeneratingCert(true);
    try {
      const cert = await installLetsEncrypt(config.ddns.domain, certEmail);
      await updateSSLConfig({
        enabled: true,
        certificate: cert
      });
    } catch (error) {
      console.error('Failed to install Lets Encrypt cert:', error);
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleSaveAllConfigs = async () => {
    try {
      await saveConfig();
      setLocalError(null);
      // 这里可以添加成功提示
    } catch (error) {
      console.error('Failed to save configs:', error);
    }
  };

  const getPublicUrl = () => {
    if (!config.ddns.enabled || !config.ddns.domain) return null;

    const protocol = config.ssl.enabled ? 'https' : 'http';
    const port = config.portForwarding.find(p => p.internalPort === 5000)?.externalPort;
    const portStr = (protocol === 'https' && port === 443) || (protocol === 'http' && port === 80) ? '' : `:${port}`;

    return `${protocol}://${config.ddns.subdomain}.${config.ddns.domain}${portStr}`;
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            远程访问
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            配置DDNS、SSL证书和远程访问设置
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={handleSaveAllConfigs}>
            <Save size={16} className="mr-2" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* DDNS配置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <Globe className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            DDNS 配置
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              DDNS 提供商
            </label>
            <select
              value={config.ddns.provider}
              onChange={(e) => updateDDNSConfig({ provider: e.target.value as DDNSConfig['provider'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="cloudflare">Cloudflare</option>
              <option value="aliyun">阿里云DNS</option>
              <option value="dnspod">DNSPod</option>
              <option value="noip">No-IP</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              域名
            </label>
            <input
              type="text"
              value={config.ddns.domain}
              onChange={(e) => updateDDNSConfig({ domain: e.target.value })}
              placeholder="example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              子域名
            </label>
            <input
              type="text"
              value={config.ddns.subdomain}
              onChange={(e) => updateDDNSConfig({ subdomain: e.target.value })}
              placeholder="frigate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API 密钥
            </label>
            <input
              type="password"
              value={config.ddns.apiKey || ''}
              onChange={(e) => updateDDNSConfig({ apiKey: e.target.value })}
              placeholder="输入API密钥"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ddns-enabled"
              checked={config.ddns.enabled}
              onChange={(e) => updateDDNSConfig({ enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ddns-enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              启用DDNS
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={handleTestDDNS}
              disabled={testingDDNS || !config.ddns.domain}
              loading={testingDDNS}
            >
              <RefreshCw size={16} className="mr-2" />
              测试连接
            </Button>

            {ddnsTestResult !== null && (
              <div className="flex items-center">
                {ddnsTestResult ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>

        {getPublicUrl() && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800 dark:text-blue-200">
                访问地址: {getPublicUrl()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
    const url = getPublicUrl();
    if (url) window.open(url, '_blank');
  }}
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SSL证书配置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-6 h-6 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            SSL 证书
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="ssl-enabled"
                checked={config.ssl.enabled}
                onChange={(e) => updateSSLConfig({ enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="ssl-enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                启用SSL
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="force-https"
                checked={config.ssl.forceHttps}
                onChange={(e) => updateSSLConfig({ forceHttps: e.target.checked })}
                disabled={!config.ssl.enabled}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="force-https" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                强制HTTPS
              </label>
            </div>
          </div>
        </div>

        {config.ssl.certificate ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              当前证书
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">域名:</span>
                <span className="ml-2 text-green-800 dark:text-green-200">{config.ssl.certificate.domain}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">颁发者:</span>
                <span className="ml-2 text-green-800 dark:text-green-200">{config.ssl.certificate.issuer}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">有效期至:</span>
                <span className="ml-2 text-green-800 dark:text-green-200">
                  {config.ssl.certificate.validUntil.toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">状态:</span>
                <span className="ml-2 text-green-800 dark:text-green-200">
                  {config.ssl.certificate.status === 'valid' ? '有效' : '无效'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                获取证书
              </h4>
              <div className="flex items-center space-x-4">
                <Button
                  variant="secondary"
                  onClick={handleGenerateSelfSignedCert}
                  disabled={generatingCert || !config.ddns.domain}
                  loading={generatingCert}
                >
                  <Key size={16} className="mr-2" />
                  生成自签名证书
                </Button>

                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={certEmail}
                    onChange={(e) => setCertEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleInstallLetsEncrypt}
                    disabled={generatingCert || !config.ddns.domain}
                    loading={generatingCert}
                  >
                    申请 Let's Encrypt
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 端口转发配置 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          端口转发
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  服务
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  内部端口
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  外部端口
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  协议
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  状态
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {config.portForwarding.map((port, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {port.description}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {port.internalPort}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    <input
                      type="number"
                      value={port.externalPort}
                      onChange={(e) => {
                        const newPorts = [...config.portForwarding];
                        newPorts[index].externalPort = parseInt(e.target.value);
                        updatePortForwarding(newPorts);
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    <select
                      value={port.protocol}
                      onChange={(e) => {
                        const newPorts = [...config.portForwarding];
                        newPorts[index].protocol = e.target.value as 'tcp' | 'udp';
                        updatePortForwarding(newPorts);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        const newPorts = [...config.portForwarding];
                        newPorts[index].enabled = !newPorts[index].enabled;
                        updatePortForwarding(newPorts);
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        port.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {port.enabled ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm">
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 访问控制 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          访问控制
        </h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="access-enabled"
              checked={config.accessControl.enabled}
              onChange={(e) => updateAccessControl({ enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="access-enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              启用访问控制
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="auth-enabled"
              checked={config.accessControl.authentication}
              onChange={(e) => updateAccessControl({ authentication: e.target.checked })}
              disabled={!config.accessControl.enabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auth-enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              启用身份验证
            </label>
          </div>

          {config.accessControl.authentication && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={config.accessControl.username || ''}
                  onChange={(e) => updateAccessControl({ username: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={config.accessControl.password || ''}
                  onChange={(e) => updateAccessControl({ password: e.target.value })}
                  placeholder="输入密码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}