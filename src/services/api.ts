import type {
  ApiResponse,
  HardwareAccelerator,
  Camera,
  AIModel,
  SystemInfo,
  DeploymentStatus,
  ServiceStatus,
  LogEntry
} from '../types';

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30秒超时

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: 'Request successful'
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      return {
        success: false,
        data: undefined,
        message: error.message,
        error: error.name
      };
    }

    return {
      success: false,
      data: undefined,
      message: '未知错误',
      error: 'UnknownError'
    };
  }
}

// API 客户端类
export class FrigateAPI {
  // 系统信息
  async getSystemInfo(): Promise<ApiResponse<SystemInfo>> {
    return apiRequest<SystemInfo>('/api/system/info');
  }

  async getSystemStatus(): Promise<ApiResponse<ServiceStatus[]>> {
    return apiRequest<ServiceStatus[]>('/api/system/status');
  }

  // 摄像头管理
  async getCameras(): Promise<ApiResponse<Camera[]>> {
    return apiRequest<Camera[]>('/api/cameras');
  }

  async getCamera(id: string): Promise<ApiResponse<Camera>> {
    return apiRequest<Camera>(`/api/cameras/${id}`);
  }

  async createCamera(camera: Omit<Camera, 'id' | 'lastSeen'>): Promise<ApiResponse<Camera>> {
    return apiRequest<Camera>('/api/cameras', {
      method: 'POST',
      body: JSON.stringify(camera),
    });
  }

  async updateCamera(id: string, updates: Partial<Camera>): Promise<ApiResponse<Camera>> {
    return apiRequest<Camera>(`/api/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCamera(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/cameras/${id}`, {
      method: 'DELETE',
    });
  }

  async discoverCameras(networkRange?: string): Promise<ApiResponse<any[]>> {
    const params = networkRange ? `?networkRange=${encodeURIComponent(networkRange)}` : '';
    return apiRequest<any[]>(`/api/cameras/discover${params}`);
  }

  async testCameraConnection(id: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiRequest<{ success: boolean; message: string }>(`/api/cameras/${id}/test`, {
      method: 'POST',
    });
  }

  // 硬件加速器管理
  async getHardwareAccelerators(): Promise<ApiResponse<HardwareAccelerator[]>> {
    return apiRequest<HardwareAccelerator[]>('/api/hardware/accelerators');
  }

  async detectHardware(): Promise<ApiResponse<HardwareAccelerator[]>> {
    return apiRequest<HardwareAccelerator[]>('/api/hardware/detect', {
      method: 'POST',
    });
  }

  async installDriver(acceleratorId: string, options: Record<string, unknown> = {}): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/hardware/accelerators/${acceleratorId}/install`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async uninstallDriver(acceleratorId: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/hardware/accelerators/${acceleratorId}/uninstall`, {
      method: 'POST',
    });
  }

  // AI模型管理
  async getModels(): Promise<ApiResponse<AIModel[]>> {
    return apiRequest<AIModel[]>('/api/models');
  }

  async getModel(id: string): Promise<ApiResponse<AIModel>> {
    return apiRequest<AIModel>(`/api/models/${id}`);
  }

  async downloadModel(modelId: string): Promise<ApiResponse<{ downloadId: string }>> {
    return apiRequest<{ downloadId: string }>(`/api/models/${modelId}/download`, {
      method: 'POST',
    });
  }

  async getDownloadProgress(downloadId: string): Promise<ApiResponse<any>> {
    return apiRequest<any>(`/api/models/download/${downloadId}/progress`);
  }

  async installModel(modelId: string, config: Record<string, unknown>): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/models/${modelId}/install`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async uninstallModel(modelId: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/models/${modelId}/uninstall`, {
      method: 'POST',
    });
  }

  async benchmarkModel(modelId: string): Promise<ApiResponse<any>> {
    return apiRequest<any>(`/api/models/${modelId}/benchmark`, {
      method: 'POST',
    });
  }

  // 日志管理
  async getLogs(params: {
    level?: string[];
    source?: string[];
    timeRange?: string;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    logs: LogEntry[];
    total: number;
    hasMore: boolean;
  }>> {
    const queryString = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{
      logs: LogEntry[];
      total: number;
      hasMore: boolean;
    }>(`/api/logs?${queryString}`);
  }

  async exportLogs(format: 'json' | 'csv' | 'txt', params: Record<string, unknown> = {}): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/logs/export?format=${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`导出失败: ${response.statusText}`);
    }

    return response.blob();
  }

  async clearLogs(): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/logs/clear', {
      method: 'POST',
    });
  }

  // 配置管理
  async getConfig(section?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const url = section ? `/api/config?section=${section}` : '/api/config';
    return apiRequest<Record<string, unknown>>(url);
  }

  async updateConfig(config: Record<string, unknown>): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async exportConfig(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/config/export`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`导出配置失败: ${response.statusText}`);
    }

    return response.blob();
  }

  async importConfig(file: File): Promise<ApiResponse<void>> {
    const formData = new FormData();
    formData.append('config', file);

    const response = await fetch(`${API_BASE_URL}/api/config/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`导入配置失败: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: null,
      message: data.message || '配置导入成功'
    };
  }

  // 部署管理
  async getDeploymentStatus(): Promise<ApiResponse<DeploymentStatus>> {
    return apiRequest<DeploymentStatus>('/api/deployment/status');
  }

  async startDeployment(config: Record<string, unknown>): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/deployment/start', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async stopDeployment(): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/deployment/stop', {
      method: 'POST',
    });
  }

  async restartDeployment(): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/deployment/restart', {
      method: 'POST',
    });
  }

  // 远程访问
  async getRemoteAccessConfig(): Promise<ApiResponse<Record<string, unknown>>> {
    return apiRequest<Record<string, unknown>>('/api/remote-access/config');
  }

  async updateRemoteAccessConfig(config: Record<string, unknown>): Promise<ApiResponse<void>> {
    return apiRequest<void>('/api/remote-access/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async testDDNSConnection(config: Record<string, unknown>): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiRequest<{ success: boolean; message: string }>('/api/remote-access/ddns/test', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

// 导出API实例
export const frigateAPI = new FrigateAPI();

// 兼容性导出
export const api = frigateAPI;