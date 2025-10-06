import { useState } from 'react';
import { X, Settings, Info, Save, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import type { HardwareAccelerator } from '../../types/hardware';

interface AcceleratorConfigModalProps {
  isOpen: boolean;
  accelerator: HardwareAccelerator | null;
  onClose: () => void;
  onSave: (config: HardwareAcceleratorConfig) => void;
  onReset: () => void;
}

export interface HardwareAcceleratorConfig {
  id: string;
  enabled: boolean;
  performanceMode: 'power' | 'balanced' | 'performance';
  maxMemory: string;
  computeUnits: number;
  enableTuning: boolean;
  advancedOptions: Record<string, any>;
}

export function AcceleratorConfigModal({
  isOpen,
  accelerator,
  onClose,
  onSave,
  onReset
}: AcceleratorConfigModalProps) {
  const [config, setConfig] = useState<HardwareAcceleratorConfig>({
    id: accelerator?.id || '',
    enabled: true,
    performanceMode: 'balanced',
    maxMemory: '2048',
    computeUnits: 1,
    enableTuning: false,
    advancedOptions: {}
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  if (!isOpen || !accelerator) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setConfig({
      id: accelerator.id,
      enabled: true,
      performanceMode: 'balanced',
      maxMemory: '2048',
      computeUnits: 1,
      enableTuning: false,
      advancedOptions: {}
    });
  };

  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {accelerator.name} 配置
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {accelerator.type.toUpperCase()} 硬件加速器详细配置
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('basic')}
              className={cn(
                "py-3 border-b-2 text-sm font-medium transition-colors",
                activeTab === 'basic'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              基本配置
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={cn(
                "py-3 border-b-2 text-sm font-medium transition-colors",
                activeTab === 'advanced'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              高级选项
            </button>
          </nav>
        </div>

        {/* 配置表单 */}
        <div className="p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* 启用状态 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    启用硬件加速
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    启用或禁用此硬件加速器
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {/* 性能模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  性能模式
                </label>
                <select
                  value={config.performanceMode}
                  onChange={(e) => setConfig({ ...config, performanceMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="power">省电模式</option>
                  <option value="balanced">平衡模式</option>
                  <option value="performance">高性能模式</option>
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  选择硬件加速器的性能模式
                </p>
              </div>

              {/* 内存限制 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  最大内存使用 (MB)
                </label>
                <input
                  type="text"
                  value={config.maxMemory}
                  onChange={(e) => setConfig({ ...config, maxMemory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  限制硬件加速器可使用的最大内存
                </p>
              </div>

              {/* 计算单元 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  计算单元数量
                </label>
                <input
                  type="number"
                  value={config.computeUnits}
                  onChange={(e) => setConfig({ ...config, computeUnits: parseInt(e.target.value) })}
                  min="1"
                  max="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  设置要使用的计算单元数量
                </p>
              </div>

              {/* 自动调优 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    启用自动调优
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    自动优化硬件加速器性能参数
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableTuning}
                  onChange={(e) => setConfig({ ...config, enableTuning: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">高级配置选项</p>
                    <p>这些选项适用于高级用户，请谨慎修改。错误的配置可能导致系统不稳定。</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {accelerator.type.toUpperCase()} 特定配置
                </h4>

                {accelerator.type === 'nvidia' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CUDA 版本
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="11.8">11.8</option>
                        <option value="12.0">12.0</option>
                        <option value="12.1">12.1</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tensor Cores
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="auto">自动</option>
                        <option value="enabled">启用</option>
                        <option value="disabled">禁用</option>
                      </select>
                    </div>
                  </div>
                )}

                {accelerator.type === 'hailo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        硬件架构
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="HAILO8">HAILO8</option>
                        <option value="HAILO15">HAILO15</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        批量推理
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="enabled">启用</option>
                        <option value="disabled">禁用</option>
                      </select>
                    </div>
                  </div>
                )}

                {accelerator.type === 'coral' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Edge TPU 版本
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="2.0">2.0</option>
                        <option value="1.0">1.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        委托模式
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="gpu">GPU</option>
                        <option value="cpu">CPU</option>
                        <option value="edgetpu">Edge TPU</option>
                      </select>
                    </div>
                  </div>
                )}

                {accelerator.type === 'apple' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Core ML 版本
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="3.0">3.0</option>
                        <option value="2.0">2.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        神经引擎
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <option value="enabled">启用</option>
                        <option value="disabled">禁用</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 自定义参数 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  自定义参数
                </h4>
                <textarea
                  rows={4}
                  placeholder="输入自定义配置参数 (JSON格式)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 font-mono text-sm"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  高级用户可在此输入自定义配置参数
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleReset}
          >
            <RotateCcw size={16} className="mr-2" />
            重置默认
          </Button>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave}>
              <Save size={16} className="mr-2" />
              保存配置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}