export interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  url: string;
  username?: string;
  password?: string;
  resolution: string;
  fps: number;
  codec: 'h264' | 'h265' | 'mjpeg';
  audioEnabled: boolean;
  detectionZones: DetectionZone[];
  hardwareAccelerator?: string;
  go2rtcConfig?: Go2RtcConfig;
  lastSeen: Date;
  manufacturer?: string;
  model?: string;
  firmware?: string;
}

export interface DetectionZone {
  id: string;
  name: string;
  points: Point[];
  enabled: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Go2RtcConfig {
  streamUrl: string;
  enabled: boolean;
  quality: 'high' | 'medium' | 'low';
  latency: number;
}

export interface DiscoveredCamera {
  ip: string;
  port: number;
  manufacturer?: string;
  model?: string;
  name?: string;
  urls: string[];
  protocols: string[];
  credentials?: {
    usernames: string[];
    passwordRequired: boolean;
  };
}

export interface CameraDiscoveryResult {
  cameras: DiscoveredCamera[];
  scanTime: number;
  networkRange: string;
}

export interface CameraService {
  // 摄像头管理
  getCameras(): Promise<Camera[]>;
  addCamera(camera: Omit<Camera, 'id' | 'lastSeen'>): Promise<Camera>;
  updateCamera(id: string, updates: Partial<Camera>): Promise<Camera>;
  deleteCamera(id: string): Promise<void>;

  // 摄像头发现
  discoverCameras(networkRange?: string): Promise<CameraDiscoveryResult>;
  testConnection(url: string, credentials?: { username?: string; password?: string }): Promise<boolean>;

  // go2rtc 集成
  configureGo2Rtc(cameraId: string, config: Go2RtcConfig): Promise<void>;
  getGo2RtcConfig(cameraId: string): Promise<Go2RtcConfig>;

  // 检测区域
  addDetectionZone(cameraId: string, zone: Omit<DetectionZone, 'id'>): Promise<DetectionZone>;
  updateDetectionZone(cameraId: string, zoneId: string, updates: Partial<DetectionZone>): Promise<DetectionZone>;
  deleteDetectionZone(cameraId: string, zoneId: string): Promise<void>;
}