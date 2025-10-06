export interface AIModel {
  id: string;
  name: string;
  description: string;
  type: 'object-detection' | 'person-detection' | 'vehicle-detection' | 'face-recognition' | 'custom';
  framework: 'tensorflow' | 'pytorch' | 'onnx' | 'tflite' | 'openvino' | 'custom';
  version: string;
  size: number; // MB
  accuracy: number; // percentage
  speed: number; // FPS
  hardwareAccelerator?: string;
  status: 'installed' | 'downloading' | 'installing' | 'available' | 'error';
  downloadUrl?: string;
  documentation?: string;
  tags: string[];
  license: string;
  author: string;
  publishDate: Date;
  lastUpdated: Date;
  dependencies?: string[];
  modelPath?: string;
  configPath?: string;
  installDate?: Date;
}

export interface ModelRepository {
  id: string;
  name: string;
  url: string;
  description: string;
  models: AIModel[];
  enabled: boolean;
  lastSync?: Date;
}

export interface ModelDownloadProgress {
  id: string;
  modelId: string;
  status: 'downloading' | 'extracting' | 'installing' | 'completed' | 'failed';
  progress: number; // 0-100
  downloadedSize: number; // bytes
  totalSize: number; // bytes
  speed: number; // bytes/s
  eta: number | null; // seconds remaining
  logs: string[];
}

export interface ModelBenchmark {
  modelId: string;
  device: string;
  precision: string;
  inputSize: [number, number];
  batchSize: number;
  fps: number;
  latency: number;
  memoryUsage: number;
  powerUsage: number;
  accuracy: number;
  testDate: Date;
  testEnvironment: {
    os: string;
    cpu: string;
    gpu: string;
    ram: string;
  };
}

export interface ModelConfig {
  modelId: string;
  confidence: number; // 0-1
  nmsThreshold?: number; // 0-1
  inputSize: [number, number];
  batchSize: number;
  device: string;
  precision: string;
  classes: string[];
  customLabels: Record<string, string>;
  preprocessing: {
    normalize: boolean;
    mean: [number, number, number];
    std: [number, number, number];
  };
  postprocessing: {
    maxDetections: number;
    minConfidence: number;
  };
  performance: {
    maxBatchSize: number;
    targetFPS: number;
    enableTensorRT: boolean;
  };
}

export interface ModelService {
  // 模型管理
  getModels(): Promise<AIModel[]>;
  getInstalledModels(): Promise<AIModel[]>;
  getAvailableModels(): Promise<AIModel[]>;
  getModel(id: string): Promise<AIModel>;

  // 模型安装
  downloadModel(modelId: string): Promise<void>;
  installModel(modelId: string, config?: ModelConfig): Promise<void>;
  uninstallModel(modelId: string): Promise<void>;
  updateModel(modelId: string): Promise<void>;

  // 下载进度
  getDownloadProgress(modelId: string): Promise<ModelDownloadProgress>;

  // 模型配置
  getModelConfig(modelId: string): Promise<ModelConfig>;
  updateModelConfig(modelId: string, config: Partial<ModelConfig>): Promise<ModelConfig>;

  // 性能测试
  benchmarkModel(modelId: string, acceleratorId?: string): Promise<ModelBenchmark>;
  getBenchmarkResults(modelId: string): Promise<ModelBenchmark[]>;

  // 仓库管理
  getRepositories(): Promise<ModelRepository[]>;
  addRepository(repository: Omit<ModelRepository, 'id' | 'models' | 'lastSync'>): Promise<ModelRepository>;
  removeRepository(repositoryId: string): Promise<void>;
  syncRepository(repositoryId: string): Promise<void>;
}