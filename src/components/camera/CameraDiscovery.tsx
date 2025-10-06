import { useState } from 'react';
import { Search, Wifi, Plus, Eye, EyeOff } from 'lucide-react';
import type { DiscoveredCamera } from '../../types/camera';
import { Button } from '../common/Button';

interface CameraDiscoveryProps {
  isDiscovering: boolean;
  discoveredCameras: DiscoveredCamera[];
  onDiscover: (networkRange?: string) => void;
  onAddCamera: (camera: DiscoveredCamera, credentials: { username: string; password: string }) => void;
  onTestConnection: (camera: DiscoveredCamera, credentials: { username: string; password: string }) => Promise<boolean>;
}

export function CameraDiscovery({
  isDiscovering,
  discoveredCameras,
  onDiscover,
  onAddCamera,
  onTestConnection
}: CameraDiscoveryProps) {
  const [networkRange, setNetworkRange] = useState('192.168.1.0/24');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({});
  const [testingConnections, setTestingConnections] = useState<Record<string, boolean>>({});
  const [connectionResults, setConnectionResults] = useState<Record<string, boolean>>({});

  const handleTestConnection = async (camera: DiscoveredCamera, cameraId: string) => {
    const creds = credentials[cameraId] || { username: '', password: '' };

    setTestingConnections(prev => ({ ...prev, [cameraId]: true }));

    try {
      const result = await onTestConnection(camera, creds);
      setConnectionResults(prev => ({ ...prev, [cameraId]: result }));
    } catch {
      setConnectionResults(prev => ({ ...prev, [cameraId]: false }));
    } finally {
      setTestingConnections(prev => ({ ...prev, [cameraId]: false }));
    }
  };

  const handleAddCamera = (camera: DiscoveredCamera, cameraId: string) => {
    const creds = credentials[cameraId];
    if (!creds?.username) {
      alert('请输入用户名');
      return;
    }
    onAddCamera(camera, creds);
  };

  const updateCredentials = (cameraId: string, field: 'username' | 'password', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        [field]: value
      }
    }));
  };

  const togglePasswordVisibility = (cameraId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            摄像头发现
          </h3>
        </div>
        <Button
          onClick={() => onDiscover(networkRange)}
          disabled={isDiscovering}
          loading={isDiscovering}
        >
          <Search size={16} className="mr-2" />
          {isDiscovering ? '扫描中...' : '开始扫描'}
        </Button>
      </div>

      {/* 网络范围设置 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          网络范围
        </label>
        <input
          type="text"
          value={networkRange}
          onChange={(e) => setNetworkRange(e.target.value)}
          placeholder="例如: 192.168.1.0/24"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      {/* 发现的摄像头列表 */}
      {discoveredCameras.length === 0 && !isDiscovering && (
        <div className="text-center py-8">
          <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            点击"开始扫描"发现网络中的摄像头
          </p>
        </div>
      )}

      {isDiscovering && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            正在扫描网络，请稍候...
          </span>
        </div>
      )}

      {discoveredCameras.length > 0 && (
        <div className="space-y-4">
          {discoveredCameras.map((camera, index) => {
            const cameraId = `${camera.ip}-${index}`;
            const creds = credentials[cameraId] || { username: '', password: '' };
            const showPassword = showPasswords[cameraId];
            const isTesting = testingConnections[cameraId];
            const connectionSuccess = connectionResults[cameraId];

            return (
              <div
                key={cameraId}
                className="border border-gray-200 rounded-lg p-4 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {camera.name || `${camera.manufacturer} ${camera.model}`}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {camera.ip}:{camera.port}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {camera.manufacturer}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {camera.model}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {connectionSuccess === true && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded dark:bg-green-900 dark:text-green-300">
                        连接成功
                      </span>
                    )}
                    {connectionSuccess === false && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded dark:bg-red-900 dark:text-red-300">
                        连接失败
                      </span>
                    )}
                  </div>
                </div>

                {/* 协议信息 */}
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        支持协议: {camera.protocols.join(', ')}
                      </span>
                </div>

                {/* 凭据输入 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={creds.username}
                      onChange={(e) => updateCredentials(cameraId, 'username', e.target.value)}
                      placeholder={camera.credentials?.usernames[0] || 'admin'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={creds.password}
                        onChange={(e) => updateCredentials(cameraId, 'password', e.target.value)}
                        placeholder={camera.credentials?.passwordRequired ? '必填' : '可选'}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(cameraId)}
                        className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTestConnection(camera, cameraId)}
                    disabled={isTesting || !creds.username}
                    loading={isTesting}
                  >
                    测试连接
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddCamera(camera, cameraId)}
                    disabled={!creds.username || connectionSuccess !== true}
                  >
                    <Plus size={16} className="mr-1" />
                    添加
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}