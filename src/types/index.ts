// 全局类型定义

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 硬件加速器类型
export interface HardwareAccelerator {
  id: string;
  name: string;
  type: 'nvidia' | 'hailo' | 'coral' | 'openvino' | 'rocm' | 'rknn' | 'apple-silicon';
  status: 'not-installed' | 'installing' | 'installed' | 'error';
  version?: string;
  description: string;
  requirements: string[];
  installProgress?: number;
  errorMessage?: string;
  capabilities: string[];
}

// 导出摄像头类型（从types/camera.ts重新导出）
export type { Camera, DiscoveredCamera, Go2RtcConfig } from './camera';

// 摄像头流类型
export interface CameraStream {
  id: string;
  name: string;
  url: string;
  resolution: string;
  fps: number;
  codec: string;
  quality: 'high' | 'medium' | 'low';
}

// AI 模型类型
export interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'yolo' | 'ssd' | 'efficientdet';
  size: number; // 文件大小 (MB)
  accuracy: number; // 准确率
  speed: number; // 推理速度 (ms)
  supportedAccelerators: string[];
  downloadUrl: string;
  status: 'available' | 'downloading' | 'installed' | 'error';
  downloadProgress?: number;
}

// 系统配置类型
export interface SystemConfig {
  frigate: FrigateConfig;
  docker: DockerConfig;
  network: NetworkConfig;
  storage: StorageConfig;
}

// Frigate 配置类型
export interface FrigateConfig {
  mqtt: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  database: {
    path: string;
  };
  detectors: Record<string, DetectorConfig>;
  cameras: Record<string, CameraConfig>;
  objects: {
    track: string[];
    filters: Record<string, any>;
  };
}

// 检测器配置类型
export interface DetectorConfig {
  type: string;
  device?: string;
  model?: {
    path: string;
    width?: number;
    height?: number;
  };
}

// 摄像头配置类型
export interface CameraConfig {
  ffmpeg: {
    inputs: Array<{
      path: string;
      roles: string[];
    }>;
    hwaccel_args?: string[];
  };
  detect: {
    enabled: boolean;
    width: number;
    height: number;
    fps: number;
  };
  record: {
    enabled: boolean;
    retain: {
      days: number;
      mode: string;
    };
  };
  snapshots: {
    enabled: boolean;
    timestamp: boolean;
    bounding_box: boolean;
  };
}

// Docker 配置类型
export interface DockerConfig {
  compose: {
    version: string;
    services: Record<string, any>;
    volumes: Record<string, any>;
    networks: Record<string, any>;
  };
}

// 网络配置类型
export interface NetworkConfig {
  ddns: {
    enabled: boolean;
    provider: string;
    domain: string;
    username?: string;
    password?: string;
  };
  ssl: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
  ports: {
    frigate: number;
    ui: number;
    rtmp?: number;
  };
}

// 存储配置类型
export interface StorageConfig {
  paths: {
    media: string;
    config: string;
    models: string;
  };
  retention: {
    recordings: number; // 天数
    snapshots: number; // 天数
  };
}

// 部署状态类型
export interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'running' | 'error' | 'stopped';
  services: ServiceStatus[];
  logs: LogEntry[];
  lastUpdated?: string;
}

// 服务状态类型
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  health: 'healthy' | 'unhealthy' | 'unknown';
  cpu: number;
  memory: number;
  restarts: number;
}

// 日志条目类型
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
}

// 应用状态类型
export interface AppState {
  // 硬件状态
  hardware: {
    accelerators: HardwareAccelerator[];
    systemInfo: SystemInfo;
    loading: boolean;
  };
  
  // 摄像头状态
  cameras: {
    list: Camera[];
    scanning: boolean;
    loading: boolean;
  };
  
  // 模型状态
  models: {
    available: AIModel[];
    installed: AIModel[];
    loading: boolean;
  };
  
  // 配置状态
  config: {
    system: SystemConfig;
    modified: boolean;
    loading: boolean;
  };
  
  // 部署状态
  deployment: {
    status: DeploymentStatus;
    loading: boolean;
  };
  
  // UI 状态
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
  };
}

// 系统信息类型
export interface SystemInfo {
  os: string;
  arch: string;
  cpu: {
    model: string;
    cores: number;
  };
  memory: {
    total: number;
    available: number;
    used: number;
    unit: 'GB' | 'MB';
  };
  gpu?: {
    vendor: string;
    model: string;
    memory: number;
  }[];
  docker: {
    installed: boolean;
    running: boolean;
    containers: number;
  };
  storage: {
    total: number;
    available: number;
    used: number;
    unit: 'GB' | 'MB';
  };
  network: {
    interfaces: NetworkInterface[];
  };
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

// 网络接口类型
export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  status: 'up' | 'down';
  speed?: number;
}

// 路由类型
export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  title: string;
  icon?: string;
  children?: RouteConfig[];
}

// 表单验证类型
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  message: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'select' | 'switch' | 'slider';
  value: any;
  rules?: ValidationRule[];
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  disabled?: boolean;
}