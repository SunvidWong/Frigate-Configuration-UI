export interface HardwareAccelerator {
  id: string;
  name: string;
  type: 'nvidia' | 'hailo' | 'coral' | 'openvino' | 'rocm' | 'rknn' | 'apple' | 'amd' | 'intel' | 'intel-ncs' | 'opencl' | 'wasm';
  status: 'available' | 'unavailable' | 'installing' | 'error';
  driverInstalled: boolean;
  version?: string;
  capabilities: string[];
  description: string;
  documentation?: string;
}

export interface HardwareDetectionResult {
  systemInfo: {
    platform: string;
    arch: string;
    osVersion: string;
  };
  accelerators: HardwareAccelerator[];
}

export interface DriverInstallationOptions {
  acceleratorId: string;
  version?: string;
  customOptions?: Record<string, any>;
}

export interface InstallationProgress {
  id: string;
  acceleratorId: string;
  status: 'downloading' | 'installing' | 'configuring' | 'completed' | 'failed';
  progress: number;
  message: string;
  logs: string[];
}

export interface HardwareService {
  detectHardware(): Promise<HardwareDetectionResult>;
  installDriver(options: DriverInstallationOptions): Promise<void>;
  getInstallationProgress(acceleratorId: string): Promise<InstallationProgress>;
  uninstallDriver(acceleratorId: string): Promise<void>;
  checkDriverStatus(acceleratorId: string): Promise<boolean>;
}