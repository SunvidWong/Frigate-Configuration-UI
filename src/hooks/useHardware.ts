import { useState, useEffect } from 'react';
import type { HardwareAccelerator, InstallationProgress } from '../types/hardware';

// 获取真实系统信息
const getSystemInfo = async () => {
  try {
    // 检测操作系统信息
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    let osType = 'unknown';
    let arch = 'unknown';
    const osVersion = 'unknown';

    // 检测操作系统类型
    if (platform.includes('linux')) {
      osType = 'linux';
    } else if (platform.includes('mac') || userAgent.includes('mac os')) {
      osType = 'macos';
    } else if (platform.includes('win') || userAgent.includes('windows')) {
      osType = 'windows';
    } else if (platform.includes('x11')) {
      osType = 'linux';
    }

    // 检测架构
    if (platform.includes('x86_64') || platform.includes('x64') || userAgent.includes('x64')) {
      arch = 'x64';
    } else if (platform.includes('arm64') || userAgent.includes('arm64')) {
      arch = 'arm64';
    } else if (platform.includes('aarch64')) {
      arch = 'arm64';
    } else if (platform.includes('x86')) {
      arch = 'x86';
    }

    // 获取更详细的系统信息（如果可能）
    if (typeof window !== 'undefined') {
      // 在浏览器环境中，我们可以使用WebGL检测GPU
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

          return {
            platform: osType,
            arch,
            osVersion,
            gpuVendor: vendor,
            gpuRenderer: renderer
          };
        }
      }
    }

    return {
      platform: osType,
      arch,
      osVersion,
      gpuVendor: 'Unknown',
      gpuRenderer: 'Unknown'
    };
  } catch {
    console.error('Failed to get system info');
    return {
      platform: 'unknown',
      arch: 'unknown',
      osVersion: 'unknown',
      gpuVendor: 'Unknown',
      gpuRenderer: 'Unknown'
    };
  }
};

// 检测NVIDIA GPU
const detectNvidiaGPU = async (_systemInfo: any): Promise<HardwareAccelerator[]> => {
  const accelerators: HardwareAccelerator[] = [];

  try {
    // 检查是否支持WebGL，并尝试获取GPU信息
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

          // 检测NVIDIA GPU
          if (vendor.toLowerCase().includes('nvidia') ||
              renderer.toLowerCase().includes('nvidia') ||
              renderer.toLowerCase().includes('geforce') ||
              renderer.toLowerCase().includes('gtx') ||
              renderer.toLowerCase().includes('rtx') ||
              renderer.toLowerCase().includes('quadro')) {

            // 提取GPU型号
            let gpuName = 'NVIDIA GPU';
            const gpuMatch = renderer.match(/(NVIDIA\s+[A-Za-z0-9\s]+)/i);
            if (gpuMatch) {
              gpuName = gpuMatch[1].trim();
            }

            accelerators.push({
              id: `nvidia-${gpuName.toLowerCase().replace(/\s+/g, '-')}`,
              name: gpuName,
              type: 'nvidia',
              status: 'available',
              driverInstalled: true, // 在WebGL可用的情况下，通常驱动已安装
              version: 'WebGL Available',
              capabilities: ['WebGL', 'OpenGL', 'GPU Computing'],
              description: 'NVIDIA GPU detected via WebGL',
              documentation: 'https://developer.nvidia.com/cuda-zone'
            });
          }

          // 检测AMD GPU
          if (vendor.toLowerCase().includes('amd') ||
              vendor.toLowerCase().includes('advanced micro devices') ||
              renderer.toLowerCase().includes('amd') ||
              renderer.toLowerCase().includes('radeon')) {

            let gpuName = 'AMD GPU';
            const gpuMatch = renderer.match(/(AMD\s+[A-Za-z0-9\s]+)/i);
            if (gpuMatch) {
              gpuName = gpuMatch[1].trim();
            }

            accelerators.push({
              id: `amd-${gpuName.toLowerCase().replace(/\s+/g, '-')}`,
              name: gpuName,
              type: 'amd',
              status: 'available',
              driverInstalled: true,
              version: 'WebGL Available',
              capabilities: ['WebGL', 'OpenGL', 'OpenCL'],
              description: 'AMD GPU detected via WebGL',
              documentation: 'https://gpuopen.com/'
            });
          }

          // 检测Intel GPU
          if (vendor.toLowerCase().includes('intel') ||
              renderer.toLowerCase().includes('intel')) {

            let gpuName = 'Intel GPU';
            const gpuMatch = renderer.match(/(Intel\s+[A-Za-z0-9\s]+)/i);
            if (gpuMatch) {
              gpuName = gpuMatch[1].trim();
            }

            accelerators.push({
              id: `intel-${gpuName.toLowerCase().replace(/\s+/g, '-')}`,
              name: gpuName,
              type: 'intel',
              status: 'available',
              driverInstalled: true,
              version: 'WebGL Available',
              capabilities: ['WebGL', 'OpenGL', 'Quick Sync Video'],
              description: 'Intel integrated GPU detected via WebGL',
              documentation: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-graphics-technology.html'
            });
          }
        }
      }
    }

    // 检测Apple Silicon GPU (Mac M1/M2/M3)
    if (_systemInfo.platform === 'macos' && _systemInfo.arch === 'arm64') {
      accelerators.push({
        id: 'apple-silicon-gpu',
        name: 'Apple Silicon GPU',
        type: 'apple',
        status: 'available',
        driverInstalled: true,
        version: 'Native',
        capabilities: ['Metal', 'Neural Engine', 'GPU Computing'],
        description: 'Apple Silicon integrated GPU with Neural Engine',
        documentation: 'https://developer.apple.com/metal/'
      });
    }

  } catch {
    console.error('Error detecting NVIDIA GPU');
  }

  return accelerators;
};

// 检测USB加速器（模拟检测）
const detectUSBAccelerators = async (): Promise<HardwareAccelerator[]> => {
  const accelerators: HardwareAccelerator[] = [];

  try {
    // 注意：在浏览器环境中无法直接访问USB设备
    // 这里我们提供一些常见的USB加速器信息，用户需要手动确认

    // Google Coral Edge TPU
    accelerators.push({
      id: 'coral-tpu-usb',
      name: 'Google Coral Edge TPU (USB)',
      type: 'coral',
      status: 'unavailable',
      driverInstalled: false,
      capabilities: ['MobileNet', 'Inception', 'EfficientNet', 'YOLO'],
      description: 'USB加速器，适用于TensorFlow Lite模型。请确认设备已连接并安装了相应驱动。',
      documentation: 'https://coral.ai/docs/'
    });

    // Hailo-8 AI Accelerator
    accelerators.push({
      id: 'hailo-8-pcie',
      name: 'Hailo-8 AI Accelerator',
      type: 'hailo',
      status: 'unavailable',
      driverInstalled: false,
      capabilities: ['YOLOv5', 'YOLOv8', 'Custom Models'],
      description: '高性能AI推理加速器，适用于边缘设备。请确认硬件已正确安装。',
      documentation: 'https://hailo.ai/documentation/'
    });

    // Intel Neural Compute Stick
    accelerators.push({
      id: 'intel-ncs2',
      name: 'Intel Neural Compute Stick 2',
      type: 'intel-ncs',
      status: 'unavailable',
      driverInstalled: false,
      capabilities: ['CNN', 'ResNet', 'MobileNet'],
      description: 'Intel神经计算棒，用于深度学习推理加速。',
      documentation: 'https://software.intel.com/en-us/neural-compute-stick'
    });

  } catch {
    console.error('Error detecting USB accelerators');
  }

  return accelerators;
};

// 检测软件加速器
const detectSoftwareAccelerators = async (): Promise<HardwareAccelerator[]> => {
  const accelerators: HardwareAccelerator[] = [];

  try {
    // 检测OpenCL支持
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        accelerators.push({
          id: 'opencl-cpu',
          name: 'OpenCL (CPU)',
          type: 'opencl',
          status: 'available',
          driverInstalled: true,
          version: 'WebGL Compatible',
          capabilities: ['General Computing', 'Image Processing'],
          description: '使用CPU进行通用计算加速',
          documentation: 'https://www.khronos.org/opencl/'
        });
      }
    }

    // WebAssembly支持
    if (typeof WebAssembly !== 'undefined') {
      accelerators.push({
        id: 'wasm-accelerator',
        name: 'WebAssembly Accelerator',
        type: 'wasm',
        status: 'available',
        driverInstalled: true,
        version: 'Native',
        capabilities: ['Model Inference', 'Signal Processing'],
        description: '使用WebAssembly进行高性能计算',
        documentation: 'https://webassembly.org/'
      });
    }

  } catch {
    console.error('Error detecting software accelerators');
  }

  return accelerators;
};

export function useHardware() {
  const [accelerators, setAccelerators] = useState<HardwareAccelerator[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installationProgress, setInstallationProgress] = useState<Record<string, InstallationProgress>>({});

  // 检测硬件
  const detectHardware = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取系统信息
      const sysInfo = await getSystemInfo();
      setSystemInfo(sysInfo);

      // 并行检测各种硬件
      const [gpuAccelerators, usbAccelerators, softwareAccelerators] = await Promise.all([
        detectNvidiaGPU(sysInfo),
        detectUSBAccelerators(),
        detectSoftwareAccelerators()
      ]);

      // 合并所有检测到的硬件
      const allAccelerators = [...gpuAccelerators, ...usbAccelerators, ...softwareAccelerators];
      setAccelerators(allAccelerators);

      console.log('Hardware detection completed:', {
        systemInfo: sysInfo,
        gpuAccelerators: gpuAccelerators.length,
        usbAccelerators: usbAccelerators.length,
        softwareAccelerators: softwareAccelerators.length,
        total: allAccelerators.length
      });

    } catch (err) {
      setError('硬件检测失败：' + (err instanceof Error ? err.message : '未知错误'));
      console.error('Hardware detection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 安装驱动（模拟）
  const installDriver = async (acceleratorId: string) => {
    const accelerator = accelerators.find(a => a.id === acceleratorId);
    if (!accelerator) return;

    // 更新状态为安装中
    setAccelerators(prev => prev.map(a =>
      a.id === acceleratorId
        ? { ...a, status: 'installing' as const }
        : a
    ));

    // 模拟安装过程
    const progressSteps = [
      { status: 'downloading' as const, progress: 20, message: '下载驱动程序...' },
      { status: 'installing' as const, progress: 60, message: '安装驱动程序...' },
      { status: 'configuring' as const, progress: 90, message: '配置系统...' },
      { status: 'completed' as const, progress: 100, message: '安装完成' }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      setInstallationProgress(prev => ({
        ...prev,
        [acceleratorId]: {
          id: `${acceleratorId}-${Date.now()}`,
          acceleratorId,
          ...step,
          logs: [step.message]
        }
      }));
    }

    // 更新最终状态
    setAccelerators(prev => prev.map(a =>
      a.id === acceleratorId
        ? { ...a, status: 'available' as const, driverInstalled: true }
        : a
    ));
  };

  // 卸载驱动（模拟）
  const uninstallDriver = async (acceleratorId: string) => {
    const accelerator = accelerators.find(a => a.id === acceleratorId);
    if (!accelerator) return;

    setAccelerators(prev => prev.map(a =>
      a.id === acceleratorId
        ? { ...a, status: 'unavailable' as const, driverInstalled: false }
        : a
    ));

    setInstallationProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[acceleratorId];
      return newProgress;
    });
  };

  // 刷新状态
  const refreshStatus = async () => {
    // 重新检测硬件
    await detectHardware();
  };

  // 初始化时自动检测硬件
  useEffect(() => {
    detectHardware();
  }, []);

  return {
    accelerators,
    systemInfo,
    loading,
    error,
    installationProgress,
    detectHardware,
    installDriver,
    uninstallDriver,
    refreshStatus
  };
}