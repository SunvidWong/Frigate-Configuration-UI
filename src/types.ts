export interface HardwareAccelerator {
  id: string;
  name: string;
  type: 'npu' | 'gpu' | 'tpu' | 'fpga' | 'vpu' | 'cpu';
  vendor: string;
  model: string;
  status: 'available' | 'in_use' | 'unavailable' | 'error';
  computeUnits: number;
  memory: {
    total: number;
    available: number;
    unit: 'GB' | 'MB';
  };
  performance?: {
    throughput: number;
    latency: number;
    powerConsumption: number;
  };
  features: string[];
  temperature?: number;
  powerUsage?: number;
  lastUpdated: string;
}

export interface Camera {
  id: string;
  name: string;
  type: 'ip' | 'usb' | 'rtsp' | 'onvif';
  status: 'connected' | 'disconnected' | 'error';
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  url: string;
  encoding: 'h264' | 'h265' | 'mjpeg' | 'yuyv';
  audioEnabled: boolean;
  motionDetection: boolean;
  aiDetection: boolean;
  zones?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  lastConnected?: string;
  lastError?: string;
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'detection' | 'classification' | 'tracking' | 'recognition';
  format: 'onnx' | 'tensorflow' | 'pytorch' | 'tensorrt' | 'openvino';
  size: number;
  accuracy: number;
  speed: number;
  supportedHardware: string[];
  objects: string[];
  categories: string[];
  status: 'available' | 'installed' | 'downloading' | 'installing' | 'error';
  downloadUrl?: string;
  installPath?: string;
  lastUpdated?: string;
  requirements?: {
    memory: number;
    compute: number;
    hardware: string[];
  };
}

export interface SystemInfo {
  os: string;
  arch: string;
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  memory: {
    total: number;
    available: number;
    used: number;
    unit: 'GB' | 'MB';
  };
  storage: {
    total: number;
    available: number;
    used: number;
    unit: 'GB' | 'MB';
  };
  docker: {
    installed: boolean;
    version?: string;
    running: boolean;
    containers: number;
  };
  network: {
    interfaces: NetworkInterface[];
  };
}

export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'bridge';
  status: 'up' | 'down';
  ip: string;
  mac: string;
  speed?: number;
  mtu: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  payload?: any;
}

export interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'deployed' | 'failed' | 'updating';
  services: DeploymentService[];
  logs: DeploymentLog[];
  lastUpdated: string;
}

export interface DeploymentService {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'restarting';
  image: string;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  environment: Record<string, string>;
  restartCount: number;
  cpu: number;
  memory: number;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
}

export interface VolumeMapping {
  host: string;
  container: string;
  mode: 'rw' | 'ro';
}

export interface DeploymentLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  service: string;
  message: string;
}

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

export interface DetectorConfig {
  type: string;
  device: string;
  model?: string;
}

export interface CameraConfig {
  ffmpeg: {
    inputs: FfmpegInput[];
  };
  detect: {
    enabled: boolean;
    zones?: Record<string, ZoneConfig>;
  };
  motion: {
    mask?: string;
  };
  snapshots: {
    enabled: boolean;
  };
  record: {
    enabled: boolean;
  };
  objects: {
    filters: Record<string, any>;
  };
}

export interface FfmpegInput {
  path: string;
  roles: string[];
}

export interface ZoneConfig {
  points: number[][];
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerService>;
  volumes: Record<string, VolumeConfig>;
  networks: Record<string, NetworkConfig>;
}

export interface DockerService {
  image: string;
  container_name?: string;
  restart: string;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
  devices: string[];
  privileged?: boolean;
  depends_on?: string[];
}

export interface VolumeConfig {
  driver?: string;
  driver_opts?: Record<string, string>;
}

export interface NetworkConfig {
  driver?: string;
  driver_opts?: Record<string, string>;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'restarting';
  image: string;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  environment: Record<string, string>;
  restartCount: number;
  cpu: number;
  memory: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  service: string;
  message: string;
}

export interface AppState {
  hardware: {
    accelerators: HardwareAccelerator[];
    systemInfo: SystemInfo;
    loading: boolean;
  };
  cameras: {
    list: Camera[];
    scanning: boolean;
    loading: boolean;
  };
  models: {
    available: AIModel[];
    installed: AIModel[];
    loading: boolean;
  };
  config: {
    system: {
      frigate: FrigateConfig;
      docker: DockerComposeConfig;
      network: {
        ddns: {
          enabled: boolean;
          provider: string;
          domain: string;
        };
        ssl: {
          enabled: boolean;
          cert?: string;
          key?: string;
        };
        ports: {
          frigate: number;
          ui: number;
        };
      };
      storage: {
        paths: {
          media: string;
          config: string;
          models: string;
        };
        retention: {
          recordings: number;
          snapshots: number;
        };
      };
    };
    modified: boolean;
    loading: boolean;
  };
  deployment: {
    status: DeploymentStatus;
    loading: boolean;
  };
  ui: UIState;
}