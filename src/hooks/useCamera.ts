import { useState, useEffect } from 'react';
import type { Camera, DiscoveredCamera, Go2RtcConfig } from '../types';
import { frigateAPI } from '../services/api';
import { frigateWS } from '../services/websocket';

export function useCamera() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [discoveredCameras, setDiscoveredCameras] = useState<DiscoveredCamera[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载摄像头列表
  const loadCameras = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await frigateAPI.getCameras();
      if (response.success) {
        setCameras(response.data || []);
      } else {
        setError(response.message || '加载摄像头列表失败');
      }
    } catch (err) {
      setError('加载摄像头列表失败');
      console.error('Failed to load cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  // 发现摄像头
  const discoverCameras = async (networkRange?: string) => {
    setDiscovering(true);
    setError(null);

    try {
      const response = await frigateAPI.discoverCameras(networkRange);
      if (response.success) {
        setDiscoveredCameras(response.data || []);
      } else {
        setError(response.message || '摄像头发现失败');
      }
    } catch (err) {
      setError('摄像头发现失败');
      console.error('Camera discovery failed:', err);
    } finally {
      setDiscovering(false);
    }
  };

  // 添加摄像头
  const addCamera = async (cameraData: Omit<Camera, 'id' | 'lastSeen'>) => {
    try {
      const response = await frigateAPI.createCamera(cameraData);
      if (response.success && response.data) {
        setCameras(prev => [...prev, response.data!]);
        return response.data;
      } else {
        setError(response.message || '添加摄像头失败');
        throw new Error(response.message || '添加摄像头失败');
      }
    } catch (err) {
      setError('添加摄像头失败');
      throw err;
    }
  };

  // 更新摄像头
  const updateCamera = async (id: string, updates: Partial<Camera>) => {
    try {
      const response = await frigateAPI.updateCamera(id, updates);
      if (response.success && response.data) {
        setCameras(prev => prev.map(camera =>
          camera.id === id ? response.data! : camera
        ));
      } else {
        setError(response.message || '更新摄像头失败');
        throw new Error(response.message || '更新摄像头失败');
      }
    } catch (err) {
      setError('更新摄像头失败');
      throw err;
    }
  };

  // 删除摄像头
  const deleteCamera = async (id: string) => {
    try {
      const response = await frigateAPI.deleteCamera(id);
      if (response.success) {
        setCameras(prev => prev.filter(camera => camera.id !== id));
      } else {
        setError(response.message || '删除摄像头失败');
        throw new Error(response.message || '删除摄像头失败');
      }
    } catch (err) {
      setError('删除摄像头失败');
      throw err;
    }
  };

  // 测试连接
  const testConnection = async (id: string) => {
    try {
      const response = await frigateAPI.testCameraConnection(id);
      return response.success ? response.data?.success || false : false;
    } catch (err) {
      return false;
    }
  };

  // 配置go2rtc
  const configureGo2Rtc = async (cameraId: string, config: Go2RtcConfig) => {
    try {
      await updateCamera(cameraId, { go2rtcConfig: config });
    } catch (err) {
      setError('go2rtc配置失败');
      throw err;
    }
  };

  // 刷新摄像头状态
  const refreshStatus = async (cameraId: string) => {
    try {
      // 获取单个摄像头最新状态
      const response = await frigateAPI.getCamera(cameraId);
      if (response.success && response.data) {
        setCameras(prev => prev.map(camera =>
          camera.id === cameraId ? response.data! : camera
        ));
      }
    } catch (err) {
      setError('刷新状态失败');
    }
  };

  // WebSocket事件处理
  useEffect(() => {
    const handleCameraStatusChange = (data: { cameraId: string; status: string; timestamp: string }) => {
      setCameras(prev => prev.map(camera =>
        camera.id === data.cameraId
          ? { ...camera, status: data.status as Camera['status'], lastSeen: new Date(data.timestamp) }
          : camera
      ));
    };

    // 订阅WebSocket事件
    frigateWS.on('camera_status_change', handleCameraStatusChange);

    return () => {
      frigateWS.off('camera_status_change', handleCameraStatusChange);
    };
  }, []);

  useEffect(() => {
    loadCameras();
  }, []);

  return {
    cameras,
    discoveredCameras,
    loading,
    discovering,
    error,
    loadCameras,
    discoverCameras,
    addCamera,
    updateCamera,
    deleteCamera,
    testConnection,
    configureGo2Rtc,
    refreshStatus
  };
}