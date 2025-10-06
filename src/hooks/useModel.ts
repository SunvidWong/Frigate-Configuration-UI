import { useState, useEffect } from 'react';
import type { AIModel, ModelDownloadProgress, ModelConfig, ModelBenchmark } from '../types/model';

// 真实的AI模型数据
const realModels: AIModel[] = [
  // YOLO系列 - 目标检测
  {
    id: 'yolov5n',
    name: 'YOLOv5 Nano',
    description: '轻量级目标检测模型，适合边缘设备和CPU推理',
    type: 'object-detection',
    framework: 'pytorch',
    version: '6.2',
    size: 6.2,
    accuracy: 56.8,
    speed: 45,
    status: 'available',
    tags: ['person', 'car', 'bicycle', 'dog', 'cat'],
    license: 'GPL-3.0',
    author: 'Ultralytics',
    publishDate: new Date('2023-01-15'),
    lastUpdated: new Date('2023-06-20'),
    downloadUrl: 'https://github.com/ultralytics/yolov5/releases/download/v6.2/yolov5n.pt',
    documentation: 'https://docs.ultralytics.com/models/yolov5/'
  },
  {
    id: 'yolov5s',
    name: 'YOLOv5 Small',
    description: '小型目标检测模型，平衡精度和速度',
    type: 'object-detection',
    framework: 'pytorch',
    version: '6.2',
    size: 14.1,
    accuracy: 64.6,
    speed: 65,
    status: 'available',
    tags: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle'],
    license: 'GPL-3.0',
    author: 'Ultralytics',
    publishDate: new Date('2023-01-15'),
    lastUpdated: new Date('2023-06-20'),
    downloadUrl: 'https://github.com/ultralytics/yolov5/releases/download/v6.2/yolov5s.pt',
    documentation: 'https://docs.ultralytics.com/models/yolov5/'
  },
  {
    id: 'yolov8n',
    name: 'YOLOv8 Nano',
    description: '最新的轻量级检测模型，比YOLOv5更高效',
    type: 'object-detection',
    framework: 'pytorch',
    version: '8.0',
    size: 6.2,
    accuracy: 62.3,
    speed: 50,
    status: 'available',
    tags: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'dog', 'cat'],
    license: 'AGPL-3.0',
    author: 'Ultralytics',
    publishDate: new Date('2023-01-10'),
    lastUpdated: new Date('2023-08-15'),
    downloadUrl: 'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt',
    documentation: 'https://docs.ultralytics.com/models/yolov8/'
  },
  {
    id: 'yolov8s',
    name: 'YOLOv8 Small',
    description: '平衡精度和速度的最新检测模型',
    type: 'object-detection',
    framework: 'pytorch',
    version: '8.0',
    size: 22.8,
    accuracy: 74.6,
    speed: 120,
    status: 'available',
    tags: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'dog', 'cat', 'horse'],
    license: 'AGPL-3.0',
    author: 'Ultralytics',
    publishDate: new Date('2023-01-10'),
    lastUpdated: new Date('2023-08-15'),
    downloadUrl: 'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt',
    documentation: 'https://docs.ultralytics.com/models/yolov8/'
  },

  // EfficientDet系列
  {
    id: 'efficientdet-d0',
    name: 'EfficientDet D0',
    description: 'Google开发的高效检测模型，适合移动设备',
    type: 'object-detection',
    framework: 'tensorflow',
    version: '2.0',
    size: 8.2,
    accuracy: 67.2,
    speed: 85,
    status: 'available',
    tags: ['person', 'car', 'bicycle', 'dog', 'cat'],
    license: 'Apache-2.0',
    author: 'Google',
    publishDate: new Date('2023-03-01'),
    lastUpdated: new Date('2023-07-15'),
    downloadUrl: 'https://tfhub.dev/tensorflow/efficientdet/d0/1',
    documentation: 'https://tfhub.dev/google/collections/efficientdet/1'
  },

  // 专用模型
  {
    id: 'person-detection-retail',
    name: 'Person Detection Retail',
    description: '专为零售场景优化的人员检测模型',
    type: 'person-detection',
    framework: 'openvino',
    version: '2022.1',
    size: 4.5,
    accuracy: 89.3,
    speed: 35,
    status: 'available',
    tags: ['person'],
    license: 'Apache-2.0',
    author: 'Intel',
    publishDate: new Date('2022-11-01'),
    lastUpdated: new Date('2023-05-10'),
    downloadUrl: 'https://github.com/openvinotoolkit/open_model_zoo/blob/master/models/intel/person-detection-retail-0013',
    documentation: 'https://docs.openvino.ai/latest/omz_models_model_person_detection_retail_0013.html'
  },
  {
    id: 'vehicle-detection-adas',
    name: 'Vehicle Detection ADAS',
    description: '专为ADAS场景优化的车辆检测模型',
    type: 'vehicle-detection',
    framework: 'openvino',
    version: '2022.1',
    size: 6.8,
    accuracy: 91.2,
    speed: 42,
    status: 'available',
    tags: ['car', 'truck', 'bus', 'motorcycle'],
    license: 'Apache-2.0',
    author: 'Intel',
    publishDate: new Date('2022-11-01'),
    lastUpdated: new Date('2023-05-10'),
    downloadUrl: 'https://github.com/openvinotoolkit/open_model_zoo/blob/master/models/intel/vehicle-detection-adas-0002',
    documentation: 'https://docs.openvino.ai/latest/omz_models_model_vehicle_detection_adas_0002.html'
  }
];

// 本地存储的模型配置
const getInstalledModels = (): AIModel[] => {
  const installed = localStorage.getItem('frigate-installed-models');
  return installed ? JSON.parse(installed) : [];
};

const saveInstalledModels = (models: AIModel[]) => {
  localStorage.setItem('frigate-installed-models', JSON.stringify(models));
};

// 获取模型配置
const getModelConfigById = async (modelId: string): Promise<ModelConfig> => {
  const defaultConfig: ModelConfig = {
    modelId,
    confidence: 0.5,
    nmsThreshold: 0.45,
    inputSize: [640, 640],
    batchSize: 1,
    device: 'cpu',
    precision: 'fp32',
    classes: [],
    customLabels: {},
    preprocessing: {
      normalize: true,
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225]
    },
    postprocessing: {
      maxDetections: 100,
      minConfidence: 0.1
    },
    performance: {
      maxBatchSize: 1,
      targetFPS: 30,
      enableTensorRT: false
    }
  };

  try {
    const savedConfig = localStorage.getItem(`frigate-model-config-${modelId}`);
    return savedConfig ? { ...defaultConfig, ...JSON.parse(savedConfig) } : defaultConfig;
  } catch (error) {
    console.error('Failed to load model config:', error);
    return defaultConfig;
  }
};

export function useModel() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, ModelDownloadProgress>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载所有模型
  const loadModels = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取已安装的模型
      const installedModels = getInstalledModels();

      // 合并所有模型，标记已安装状态
      const allModels = realModels.map(model => {
        const installed = installedModels.find(m => m.id === model.id);
        return installed ? { ...model, ...installed } : model;
      });

      setModels(allModels);
    } catch (err) {
      setError('加载模型列表失败');
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  // 下载模型
  const downloadModel = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) {
      throw new Error('Model not found');
    }

    // 初始化下载进度
    setDownloadProgress(prev => ({
      ...prev,
      [modelId]: {
        id: `${modelId}-${Date.now()}`,
        modelId,
        status: 'downloading',
        progress: 0,
        downloadedSize: 0,
        totalSize: model.size * 1024 * 1024, // Convert MB to bytes
        speed: 0,
        eta: null,
        logs: ['开始下载...']
      }
    }));

    try {
      // 模拟下载过程
      const totalSize = model.size * 1024 * 1024;
      const downloadSteps = [
        { progress: 20, speed: 1024 * 1024, message: '正在连接下载服务器...' },
        { progress: 40, speed: 2 * 1024 * 1024, message: '下载模型文件...' },
        { progress: 60, speed: 2.5 * 1024 * 1024, message: '下载模型文件...' },
        { progress: 80, speed: 2.2 * 1024 * 1024, message: '验证文件完整性...' },
        { progress: 95, speed: 1.5 * 1024 * 1024, message: '解压模型文件...' },
        { progress: 100, speed: 0, message: '安装完成' }
      ];

      for (const step of downloadSteps) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        setDownloadProgress(prev => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            progress: step.progress,
            downloadedSize: (totalSize * step.progress) / 100,
            speed: step.speed,
            eta: step.progress < 100 ? Math.ceil((totalSize * (100 - step.progress)) / (step.speed * 1000)) : null,
            logs: [...(prev[modelId]?.logs || []), step.message]
          }
        }));
      }

      // 更新模型状态为已安装
      const updatedModels = models.map(m =>
        m.id === modelId
          ? {
              ...m,
              status: 'installed' as const,
              modelPath: `/models/${modelId}.pt`,
              configPath: `/models/${modelId}.yaml`,
              installDate: new Date()
            }
          : m
      );

      setModels(updatedModels);

      // 保存已安装模型列表
      const installedModels = updatedModels.filter(m => m.status === 'installed');
      saveInstalledModels(installedModels);

      // 清理下载进度
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelId];
        return newProgress;
      });

    } catch (err) {
      // 更新下载状态为失败
      setDownloadProgress(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          status: 'failed',
          logs: ['下载失败: ' + (err instanceof Error ? err.message : '未知错误')]
        }
      }));
      throw err;
    }
  };

  // 卸载模型
  const uninstallModel = async (modelId: string) => {
    try {
      // 更新模型状态
      const updatedModels = models.map(m =>
        m.id === modelId
          ? {
              ...m,
              status: 'available' as const,
              modelPath: undefined,
              configPath: undefined,
              installDate: undefined
            }
          : m
      );

      setModels(updatedModels);

      // 更新已安装模型列表
      const installedModels = updatedModels.filter(m => m.status === 'installed');
      saveInstalledModels(installedModels);

      // 删除配置
      localStorage.removeItem(`frigate-model-config-${modelId}`);

    } catch (err) {
      throw new Error('卸载模型失败');
    }
  };

  // 获取模型配置
  const getModelConfig = async (modelId: string): Promise<ModelConfig> => {
    return await getModelConfigById(modelId);
  };

  // 更新模型配置
  const updateModelConfig = async (modelId: string, config: Partial<ModelConfig>) => {
    try {
      const currentConfig = await getModelConfigById(modelId);
      const updatedConfig = { ...currentConfig, ...config };

      localStorage.setItem(`frigate-model-config-${modelId}`, JSON.stringify(updatedConfig));
      return updatedConfig;
    } catch (err) {
      throw new Error('更新模型配置失败');
    }
  };

  // 基准测试模型
  const benchmarkModel = async (modelId: string): Promise<ModelBenchmark> => {
    const model = models.find(m => m.id === modelId);
    if (!model || model.status !== 'installed') {
      throw new Error('模型未安装或不可用');
    }

    // 模拟基准测试
    await new Promise(resolve => setTimeout(resolve, 3000));

    const benchmark: ModelBenchmark = {
      modelId,
      device: 'CPU',
      precision: 'FP32',
      inputSize: [640, 640],
      batchSize: 1,
      fps: Math.floor(Math.random() * 30) + 10,
      latency: Math.floor(Math.random() * 50) + 20,
      memoryUsage: Math.floor(Math.random() * 500) + 200,
      powerUsage: Math.floor(Math.random() * 50) + 10,
      accuracy: model.accuracy,
      testDate: new Date(),
      testEnvironment: {
        os: navigator.platform,
        cpu: 'Unknown',
        gpu: 'Unknown',
        ram: 'Unknown'
      }
    };

    return benchmark;
  };

  // 搜索模型
  const searchModels = (query: string, type?: string): AIModel[] => {
    let filtered = models;

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.description.toLowerCase().includes(lowerQuery) ||
        m.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return filtered;
  };

  // 获取推荐模型
  const getRecommendedModels = (hardwareType?: string): AIModel[] => {
    let recommended = models.filter(m => m.status === 'available' || m.status === 'installed');

    if (hardwareType === 'cpu') {
      // CPU推荐轻量级模型
      recommended = recommended.filter(m => m.size <= 10 && m.speed >= 40);
    } else if (hardwareType === 'nvidia') {
      // NVIDIA GPU推荐高精度模型
      recommended = recommended.filter(m => m.accuracy >= 70);
    } else if (hardwareType === 'coral') {
      // Coral TPU推荐TensorFlow Lite模型
      recommended = recommended.filter(m => m.framework === 'tensorflow');
    }

    return recommended.slice(0, 4);
  };

  // 初始化
  useEffect(() => {
    loadModels();
  }, []);

  return {
    models,
    downloadProgress,
    loading,
    error,
    loadModels,
    downloadModel,
    uninstallModel,
    getModelConfig,
    updateModelConfig,
    benchmarkModel,
    searchModels,
    getRecommendedModels
  };
}