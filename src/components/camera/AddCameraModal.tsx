import { useState } from 'react';
import { X, Eye, EyeOff, Plus, TestTube } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import type { Camera } from '../../types/camera';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCamera: (camera: Omit<Camera, 'id' | 'lastSeen'>) => void;
  onTestConnection: (camera: Partial<Camera>) => Promise<boolean>;
}

export function AddCameraModal({ isOpen, onClose, onAddCamera, onTestConnection }: AddCameraModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const [cameraData, setCameraData] = useState<Partial<Camera>>({
    name: '',
    url: '',
    username: '',
    password: '',
    resolution: '1920x1080',
    fps: 30,
    codec: 'h264',
    audioEnabled: false,
    detectionZones: []
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cameraData.name || !cameraData.url) {
      alert('请填写摄像头名称和URL');
      return;
    }

    try {
      await onAddCamera(cameraData as Omit<Camera, 'id' | 'lastSeen'>);
      onClose();
      // 重置表单
      setCameraData({
        name: '',
        url: '',
        username: '',
        password: '',
        resolution: '1920x1080',
        fps: 30,
        codec: 'h264',
        audioEnabled: false,
        detectionZones: []
      });
    } catch (err) {
      console.error('Failed to add camera:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!cameraData.url) {
      alert('请输入摄像头URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTestConnection(cameraData);
      setTestResult(result);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            手动添加摄像头
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  摄像头名称 *
                </label>
                <input
                  type="text"
                  value={cameraData.name}
                  onChange={(e) => setCameraData({ ...cameraData, name: e.target.value })}
                  placeholder="例如: 前门摄像头"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  RTSP URL *
                </label>
                <input
                  type="text"
                  value={cameraData.url}
                  onChange={(e) => setCameraData({ ...cameraData, url: e.target.value })}
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          </div>

          {/* 认证信息 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              认证信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={cameraData.username || ''}
                  onChange={(e) => setCameraData({ ...cameraData, username: e.target.value })}
                  placeholder="admin"
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
                    value={cameraData.password || ''}
                    onChange={(e) => setCameraData({ ...cameraData, password: e.target.value })}
                    placeholder="摄像头密码"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 视频设置 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              视频设置
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分辨率
                </label>
                <select
                  value={cameraData.resolution}
                  onChange={(e) => setCameraData({ ...cameraData, resolution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="640x480">640x480</option>
                  <option value="1280x720">1280x720</option>
                  <option value="1920x1080">1920x1080</option>
                  <option value="2560x1440">2560x1440</option>
                  <option value="3840x2160">3840x2160</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  帧率 (FPS)
                </label>
                <input
                  type="number"
                  value={cameraData.fps}
                  onChange={(e) => setCameraData({ ...cameraData, fps: parseInt(e.target.value) })}
                  min="1"
                  max="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  编解码器
                </label>
                <select
                  value={cameraData.codec}
                  onChange={(e) => setCameraData({ ...cameraData, codec: e.target.value as Camera['codec'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="h264">H.264</option>
                  <option value="h265">H.265</option>
                  <option value="mjpeg">MJPEG</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  音频
                </label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    id="audio-enabled"
                    checked={cameraData.audioEnabled}
                    onChange={(e) => setCameraData({ ...cameraData, audioEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="audio-enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    启用音频
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 连接测试结果 */}
          {testResult !== null && (
            <div className={cn(
              "p-4 rounded-lg border",
              testResult
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            )}>
              <div className="flex items-center">
                {testResult ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                    <span className="text-green-800 dark:text-green-200">连接成功！</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                    <span className="text-red-800 dark:text-red-200">连接失败，请检查配置</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={testing || !cameraData.url}
                loading={testing}
              >
                <TestTube size={16} className="mr-2" />
                {testing ? '测试中...' : '测试连接'}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">
                <Plus size={16} className="mr-2" />
                添加摄像头
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}