import { useEffect, useState } from 'react';
import { Camera as CameraIcon, Plus, Settings, Trash2, RefreshCw, AlertTriangle, Wifi } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useCamera } from '../hooks/useCamera';
import { Button } from '../components/common/Button';
import { CameraDiscovery } from '../components/camera/CameraDiscovery';
import { AddCameraModal } from '../components/camera/AddCameraModal';
import type { DiscoveredCamera } from '../types/camera';
import { cn } from '../utils/cn';

export default function CameraManagement() {
  const { dispatch } = useAppContext();
  const {
    cameras,
    discoveredCameras,
    loading,
    discovering,
    error,
    loadCameras,
    discoverCameras,
    addCamera,
    deleteCamera,
    testConnection,
    refreshStatus
  } = useCamera();

  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    dispatch(actions.setCurrentPage('cameras'));
  }, [dispatch]);

  const handleAddDiscoveredCamera = async (camera: DiscoveredCamera, credentials: { username: string; password: string }) => {
    try {
      await addCamera({
        name: camera.name || `${camera.manufacturer} ${camera.model}`,
        status: 'online',
        url: camera.urls[0],
        username: credentials.username,
        password: credentials.password,
        resolution: '1920x1080',
        fps: 30,
        codec: 'h264',
        audioEnabled: false,
        detectionZones: [],
        manufacturer: camera.manufacturer,
        model: camera.model
      });

      // 清空发现结果
      setShowDiscovery(false);
    } catch (error) {
      console.error('Failed to add camera:', error);
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    if (confirm('确定要删除这个摄像头吗？')) {
      try {
        await deleteCamera(cameraId);
      } catch (error) {
        console.error('Failed to delete camera:', error);
      }
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            摄像头管理
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            管理和配置监控摄像头
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={loadCameras}
            disabled={loading}
          >
            <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
            刷新
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDiscovery(!showDiscovery)}
          >
            <Wifi size={20} className="mr-2" />
            {showDiscovery ? '隐藏发现' : '发现摄像头'}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={20} className="mr-2" />
            手动添加
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

      {/* 摄像头发现面板 */}
      {showDiscovery && (
        <div className="mb-8">
          <CameraDiscovery
            isDiscovering={discovering}
            discoveredCameras={discoveredCameras}
            onDiscover={discoverCameras}
            onAddCamera={handleAddDiscoveredCamera}
            onTestConnection={(camera) => testConnection(camera.id)}
          />
        </div>
      )}

      {/* 摄像头列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  摄像头
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  分辨率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  帧率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  硬件加速
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">
                        加载摄像头列表...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : cameras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <div className="text-center">
                      <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        还没有添加摄像头
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        使用"发现摄像头"功能自动搜索，或手动添加摄像头
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cameras.map((camera) => (
                  <tr key={camera.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CameraIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {camera.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {camera.manufacturer && `${camera.manufacturer} ${camera.model || ''}`}
                            {camera.url && ` • ${camera.url}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          camera.status === 'online'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : camera.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            camera.status === 'online' ? 'bg-green-500' :
                            camera.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                        />
                        {camera.status === 'online' ? '在线' :
                         camera.status === 'error' ? '错误' : '离线'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {camera.resolution}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {camera.fps} FPS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {camera.hardwareAccelerator ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-200">
                          {camera.hardwareAccelerator}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          无
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshStatus(camera.id)}
                          title="刷新状态"
                        >
                          <RefreshCw size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="配置"
                        >
                          <Settings size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCamera(camera.id)}
                          className="text-red-600 hover:text-red-700"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 手动添加摄像头模态框 */}
      <AddCameraModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddCamera={async (cameraData) => {
          try {
            await addCamera(cameraData);
          } catch (error) {
            console.error('Failed to add camera:', error);
          }
        }}
        onTestConnection={async (camera) => {
          try {
            return await testConnection(camera.id);
          } catch (error) {
            return false;
          }
        }}
      />
    </div>
  );
}