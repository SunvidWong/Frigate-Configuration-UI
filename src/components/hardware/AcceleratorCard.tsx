import { CheckCircle, XCircle, AlertCircle, Download, Play, Square, ExternalLink, Settings, Activity, BarChart3 } from 'lucide-react';
import type { HardwareAccelerator } from '../../types/hardware';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import { AcceleratorPerformance } from './AcceleratorPerformance';

interface AcceleratorCardProps {
  accelerator: HardwareAccelerator;
  isInstalling?: boolean;
  installationProgress?: {
    id: string;
    acceleratorId: string;
    status: string;
    progress: number;
    message: string;
    logs: string[];
  };
  onInstall?: () => void;
  onUninstall?: () => void;
  onRefresh?: () => void;
  onConfigure?: () => void;
  showPerformance?: boolean;
  onTogglePerformance?: () => void;
}

export function AcceleratorCard({
  accelerator,
  isInstalling = false,
  installationProgress,
  onInstall,
  onUninstall,
  onRefresh,
  onConfigure,
  showPerformance = false,
  onTogglePerformance
}: AcceleratorCardProps) {
  const getStatusIcon = () => {
    switch (accelerator.status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unavailable':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'installing':
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (accelerator.status) {
      case 'available':
        return accelerator.driverInstalled ? '已安装' : '可用';
      case 'unavailable':
        return '未安装';
      case 'installing':
        return '安装中';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'nvidia':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'hailo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'coral':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'openvino':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'rocm':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'rknn':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'apple':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {accelerator.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getTypeColor(accelerator.type)
              )}>
                {accelerator.type.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {accelerator.documentation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(accelerator.documentation, '_blank')}
          >
            <ExternalLink size={16} />
          </Button>
        )}
      </div>

      {/* 描述 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {accelerator.description}
      </p>

      {/* 版本信息 */}
      {accelerator.version && (
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            版本: {accelerator.version}
          </span>
        </div>
      )}

      {/* 功能特性 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          支持功能:
        </h4>
        <div className="flex flex-wrap gap-1">
          {accelerator.capabilities.map((capability, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* 安装进度 */}
      {isInstalling && installationProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {installationProgress.message}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {installationProgress.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${installationProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center space-x-2">
        {!accelerator.driverInstalled ? (
          <Button
            onClick={onInstall}
            disabled={isInstalling}
            loading={isInstalling}
            className="flex-1"
          >
            <Download size={16} className="mr-2" />
            {isInstalling ? '安装中...' : '安装驱动'}
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={onRefresh}
              size="sm"
              title="检查状态"
            >
              <Play size={16} />
            </Button>
            <Button
              variant="secondary"
              onClick={onConfigure}
              size="sm"
              title="配置"
            >
              <Settings size={16} />
            </Button>
            <Button
              variant="secondary"
              onClick={onTogglePerformance}
              size="sm"
              title={showPerformance ? "隐藏性能" : "显示性能"}
            >
              <BarChart3 size={16} />
            </Button>
            <Button
              variant="danger"
              onClick={onUninstall}
              size="sm"
              title="卸载"
            >
              <Square size={16} />
            </Button>
          </>
        )}
      </div>

      {/* 性能监控面板 */}
      {accelerator.driverInstalled && showPerformance && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              性能监控
            </h4>
            <div className="flex items-center space-x-1">
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">
                实时监控中
              </span>
            </div>
          </div>
          <AcceleratorPerformance
            acceleratorId={accelerator.id}
            isMonitoring={showPerformance}
          />
        </div>
      )}
    </div>
  );
}