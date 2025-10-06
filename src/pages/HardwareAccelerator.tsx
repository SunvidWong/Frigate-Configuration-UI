import { useEffect, useState } from 'react';
import { Cpu, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useHardware } from '../hooks/useHardware';
import { AcceleratorCard } from '../components/hardware/AcceleratorCard';
import { AcceleratorConfigModal, type HardwareAcceleratorConfig } from '../components/hardware/AcceleratorConfigModal';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';

export default function HardwareAccelerator() {
  const { dispatch } = useAppContext();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedAccelerator, setSelectedAccelerator] = useState<any>(null);
  const [performanceStates, setPerformanceStates] = useState<Record<string, boolean>>({});

  const {
    accelerators,
    systemInfo,
    loading,
    error,
    installationProgress,
    detectHardware,
    installDriver,
    uninstallDriver,
    refreshStatus
  } = useHardware();

  useEffect(() => {
    dispatch(actions.setCurrentPage('hardware'));
  }, [dispatch]);

  const handleConfigure = (accelerator: any) => {
    setSelectedAccelerator(accelerator);
    setShowConfigModal(true);
  };

  const handleTogglePerformance = (acceleratorId: string) => {
    setPerformanceStates(prev => ({
      ...prev,
      [acceleratorId]: !prev[acceleratorId]
    }));
  };

  const handleSaveConfig = (config: HardwareAcceleratorConfig) => {
    console.log('Saving accelerator config:', config);
    // TODO: Save configuration to backend
  };

  const handleResetConfig = () => {
    console.log('Resetting accelerator config');
    // TODO: Reset configuration to defaults
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            硬件加速器
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            检测、安装和管理硬件加速器驱动
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={detectHardware}
          disabled={loading}
        >
          <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
          重新检测
        </Button>
      </div>

      {/* 系统信息 */}
      {systemInfo && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            系统信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                操作系统:
              </span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {systemInfo.platform.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                系统架构:
              </span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {systemInfo.arch}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                系统版本:
              </span>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {systemInfo.osVersion || 'Unknown'}
              </span>
            </div>
            {systemInfo.gpuVendor && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  GPU厂商:
                </span>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {systemInfo.gpuVendor}
                </span>
              </div>
            )}
            {systemInfo.gpuRenderer && (
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  GPU型号:
                </span>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {systemInfo.gpuRenderer}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            正在检测硬件...
          </span>
        </div>
      )}

      {/* 硬件加速器列表 */}
      {!loading && !error && (
        <div className="space-y-6">
          {accelerators.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                未检测到硬件加速器
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                系统中没有检测到支持的硬件加速器设备。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {accelerators.map((accelerator) => (
                <AcceleratorCard
                  key={accelerator.id}
                  accelerator={accelerator}
                  isInstalling={accelerator.status === 'installing'}
                  installationProgress={installationProgress[accelerator.id]}
                  onInstall={() => installDriver(accelerator.id)}
                  onUninstall={() => uninstallDriver(accelerator.id)}
                  onRefresh={() => refreshStatus()}
                  onConfigure={() => handleConfigure(accelerator)}
                  showPerformance={performanceStates[accelerator.id] || false}
                  onTogglePerformance={() => handleTogglePerformance(accelerator.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-blue-900/20 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          使用说明
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• 确保硬件加速器已正确连接到系统</li>
          <li>• 安装驱动程序前请先查看设备兼容性文档</li>
          <li>• 某些驱动程序可能需要系统重启</li>
          <li>• 安装过程中请勿关闭浏览器或刷新页面</li>
          <li>• 如遇问题请查看设备日志或联系技术支持</li>
        </ul>
      </div>

      {/* 配置模态框 */}
      <AcceleratorConfigModal
        isOpen={showConfigModal}
        accelerator={selectedAccelerator}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
        onReset={handleResetConfig}
      />
    </div>
  );
}