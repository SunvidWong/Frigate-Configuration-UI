import { useEffect, useState } from 'react';
import { Brain, Download, Trash2, BarChart3, RefreshCw, AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useModel } from '../hooks/useModel';
import { Button } from '../components/common/Button';
import type { ModelConfig } from '../types/model';
import { cn } from '../utils/cn';

export default function ModelManagement() {
  const { dispatch } = useAppContext();
  const {
    models,
    downloadProgress,
    loading,
    error,
    loadModels,
    downloadModel,
    uninstallModel,
    getModelConfig,
    updateModelConfig,
    benchmarkModel
  } = useModel();

  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [benchmarking, setBenchmarking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dispatch(actions.setCurrentPage('models'));
  }, [dispatch]);

  const handleDownloadModel = async (modelId: string) => {
    try {
      await downloadModel(modelId);
    } catch (error) {
      console.error('Failed to download model:', error);
    }
  };

  const handleUninstallModel = async (modelId: string) => {
    try {
      await uninstallModel(modelId);
    } catch (error) {
      console.error('Failed to uninstall model:', error);
    }
  };

  const handleShowConfig = async (modelId: string) => {
    try {
      const modelConfig = await getModelConfig(modelId);
      setConfig(modelConfig);
      setShowConfig(modelId);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !showConfig) return;

    try {
      await updateModelConfig(showConfig, config);
      setShowConfig(null);
      setConfig(null);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleBenchmark = async (modelId: string) => {
    setBenchmarking(prev => ({ ...prev, [modelId]: true }));

    try {
      const result = await benchmarkModel(modelId);
      alert(`性能测试完成:\n延迟: ${result.latency.toFixed(2)}ms\nFPS: ${result.fps.toFixed(1)}\n内存使用: ${result.memoryUsage.toFixed(1)}MB`);
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setBenchmarking(prev => ({ ...prev, [modelId]: false }));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'object-detection':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'person-detection':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'vehicle-detection':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'face-recognition':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'installed':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'downloading':
      case 'installing':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI 模型管理
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            下载、配置和管理AI检测模型
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadModels}
          disabled={loading}
        >
          <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
          刷新
        </Button>
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

      {/* 模型列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              加载模型列表...
            </span>
          </div>
        ) : models.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              没有可用的模型
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              请检查模型仓库配置或网络连接
            </p>
          </div>
        ) : (
          models.map((model) => {
            const progress = downloadProgress[model.id];
            const isBenchmarking = benchmarking[model.id];

            return (
              <div
                key={model.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(model.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {model.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getTypeColor(model.type)
                        )}>
                          {model.type.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          v{model.version} • {model.framework.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {model.documentation && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(model.documentation, '_blank')}
                    >
                      <ExternalLink size={16} />
                    </Button>
                  )}
                </div>

                {/* 描述 */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {model.description}
                </p>

                {/* 性能指标 */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {model.accuracy}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">精度</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {model.speed}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">FPS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {model.size}MB
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">大小</div>
                  </div>
                </div>

                {/* 下载进度 */}
                {progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {progress.status === 'downloading' ? '下载中...' : '安装中...'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {progress.downloadedSize.toFixed(1)}MB / {progress.totalSize.toFixed(1)}MB
                      </span>
                      {progress.speed > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {progress.speed.toFixed(1)}MB/s
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2">
                  {model.status === 'installed' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleShowConfig(model.id)}
                        className="flex-1"
                      >
                        <Settings size={16} className="mr-1" />
                        配置
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBenchmark(model.id)}
                        disabled={isBenchmarking}
                        loading={isBenchmarking}
                        className="flex-1"
                      >
                        <BarChart3 size={16} className="mr-1" />
                        测试
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleUninstallModel(model.id)}
                        className="flex-1"
                      >
                        <Trash2 size={16} className="mr-1" />
                        卸载
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleDownloadModel(model.id)}
                      disabled={model.status === 'downloading' || model.status === 'installing'}
                      loading={model.status === 'downloading' || model.status === 'installing'}
                      className="w-full"
                    >
                      <Download size={16} className="mr-2" />
                      {model.status === 'downloading' ? '下载中...' :
                       model.status === 'installing' ? '安装中...' : '下载'}
                    </Button>
                  )}
                </div>

                {/* 标签 */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {model.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 配置弹窗 */}
      {showConfig && config && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              模型配置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  置信度阈值
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.confidence}
                  onChange={(e) => setConfig({ ...config, confidence: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IOU 阈值
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.nmsThreshold || 0.45}
                  onChange={(e) => setConfig({ ...config, nmsThreshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  最大检测数
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.postprocessing.maxDetections}
                  onChange={(e) => setConfig({
                    ...config,
                    postprocessing: {
                      ...config.postprocessing,
                      maxDetections: parseInt(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  输入分辨率
                </label>
                <select
                  value={`${config.inputSize[0]}x${config.inputSize[1]}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setConfig({
                      ...config,
                      inputSize: [width, height]
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="320x320">320x320</option>
                  <option value="416x416">416x416</option>
                  <option value="512x512">512x512</option>
                  <option value="640x640">640x640</option>
                  <option value="1280x1280">1280x1280</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowConfig(null)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="flex-1"
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}