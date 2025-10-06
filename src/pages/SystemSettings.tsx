import { useState } from 'react';
import { Settings, Download, Upload, AlertTriangle, Save, Monitor, Database, Lock } from 'lucide-react';
import { Button } from '../components/common/Button';

interface SystemConfig {
  general: {
    systemName: string;
    timezone: string;
    language: string;
    logLevel: string;
  };
  database: {
    type: 'sqlite' | 'postgresql' | 'mysql';
    backupEnabled: boolean;
    backupInterval: number;
    retentionDays: number;
  };
  notifications: {
    emailEnabled: boolean;
    emailSmtp: string;
    emailPort: number;
    emailUsername: string;
    emailPassword: string;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  security: {
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    twoFactorEnabled: boolean;
  };
  performance: {
    maxConcurrentStreams: number;
    recordingRetention: number;
    snapshotInterval: number;
    cacheSize: number;
  };
}

export default function SystemSettings() {

  const [config, setConfig] = useState<SystemConfig>({
    general: {
      systemName: 'Frigate Configuration UI',
      timezone: 'Asia/Shanghai',
      language: 'zh-CN',
      logLevel: 'INFO'
    },
    database: {
      type: 'sqlite',
      backupEnabled: true,
      backupInterval: 24,
      retentionDays: 30
    },
    notifications: {
      emailEnabled: false,
      emailSmtp: '',
      emailPort: 587,
      emailUsername: '',
      emailPassword: '',
      webhookEnabled: false,
      webhookUrl: ''
    },
    security: {
      sessionTimeout: 3600,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
      },
      twoFactorEnabled: false
    },
    performance: {
      maxConcurrentStreams: 10,
      recordingRetention: 7,
      snapshotInterval: 10,
      cacheSize: 1024
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      // 模拟保存配置
      await new Promise(resolve => setTimeout(resolve, 1500));
      // 这里可以添加成功提示
    } catch (err) {
      setError('保存配置失败');
      console.error('Failed to save config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `frigate-config-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig(importedConfig);
        setError(null);
      } catch (err) {
        setError('导入配置文件失败');
      }
    };
    reader.readAsText(file);
  };

  const updateConfig = (section: keyof SystemConfig, updates: Partial<SystemConfig[typeof section]>) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            系统设置
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            配置系统参数和偏好设置
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={handleExportConfig}>
            <Download size={16} className="mr-2" />
            导出配置
          </Button>
          <Button variant="secondary">
            <Upload size={16} className="mr-2" />
            <label className="cursor-pointer">
              导入配置
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="hidden"
              />
            </label>
          </Button>
          <Button onClick={handleSaveConfig} disabled={loading} loading={loading}>
            <Save size={16} className="mr-2" />
            保存设置
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本设置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              基本设置
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                系统名称
              </label>
              <input
                type="text"
                value={config.general.systemName}
                onChange={(e) => updateConfig('general', { systemName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                时区
              </label>
              <select
                value={config.general.timezone}
                onChange={(e) => updateConfig('general', { timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                语言
              </label>
              <select
                value={config.general.language}
                onChange={(e) => updateConfig('general', { language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                日志级别
              </label>
              <select
                value={config.general.logLevel}
                onChange={(e) => updateConfig('general', { logLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
          </div>
        </div>

        {/* 数据库设置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <Database className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              数据库设置
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                数据库类型
              </label>
              <select
                value={config.database.type}
                onChange={(e) => updateConfig('database', { type: e.target.value as SystemConfig['database']['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="sqlite">SQLite</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="backup-enabled"
                checked={config.database.backupEnabled}
                onChange={(e) => updateConfig('database', { backupEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="backup-enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                启用自动备份
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  备份间隔 (小时)
                </label>
                <input
                  type="number"
                  value={config.database.backupInterval}
                  onChange={(e) => updateConfig('database', { backupInterval: parseInt(e.target.value) })}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  保留天数
                </label>
                <input
                  type="number"
                  value={config.database.retentionDays}
                  onChange={(e) => updateConfig('database', { retentionDays: parseInt(e.target.value) })}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 安全设置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <Lock className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              安全设置
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                会话超时 (秒)
              </label>
              <input
                type="number"
                value={config.security.sessionTimeout}
                onChange={(e) => updateConfig('security', { sessionTimeout: parseInt(e.target.value) })}
                min="300"
                max="86400"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                密码策略
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">最小长度</span>
                  <input
                    type="number"
                    value={config.security.passwordPolicy.minLength}
                    onChange={(e) => updateConfig('security', {
                      passwordPolicy: { ...config.security.passwordPolicy, minLength: parseInt(e.target.value) }
                    })}
                    min="4"
                    max="64"
                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require-uppercase"
                    checked={config.security.passwordPolicy.requireUppercase}
                    onChange={(e) => updateConfig('security', {
                      passwordPolicy: { ...config.security.passwordPolicy, requireUppercase: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="require-uppercase" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    要求大写字母
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require-lowercase"
                    checked={config.security.passwordPolicy.requireLowercase}
                    onChange={(e) => updateConfig('security', {
                      passwordPolicy: { ...config.security.passwordPolicy, requireLowercase: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="require-lowercase" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    要求小写字母
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require-numbers"
                    checked={config.security.passwordPolicy.requireNumbers}
                    onChange={(e) => updateConfig('security', {
                      passwordPolicy: { ...config.security.passwordPolicy, requireNumbers: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="require-numbers" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    要求数字
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="two-factor"
                checked={config.security.twoFactorEnabled}
                onChange={(e) => updateConfig('security', { twoFactorEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="two-factor" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                启用双因素认证
              </label>
            </div>
          </div>
        </div>

        {/* 性能设置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <Monitor className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              性能设置
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  最大并发流
                </label>
                <input
                  type="number"
                  value={config.performance.maxConcurrentStreams}
                  onChange={(e) => updateConfig('performance', { maxConcurrentStreams: parseInt(e.target.value) })}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  录像保留天数
                </label>
                <input
                  type="number"
                  value={config.performance.recordingRetention}
                  onChange={(e) => updateConfig('performance', { recordingRetention: parseInt(e.target.value) })}
                  min="1"
                  max="90"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  快照间隔 (秒)
                </label>
                <input
                  type="number"
                  value={config.performance.snapshotInterval}
                  onChange={(e) => updateConfig('performance', { snapshotInterval: parseInt(e.target.value) })}
                  min="1"
                  max="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  缓存大小 (MB)
                </label>
                <input
                  type="number"
                  value={config.performance.cacheSize}
                  onChange={(e) => updateConfig('performance', { cacheSize: parseInt(e.target.value) })}
                  min="128"
                  max="8192"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}