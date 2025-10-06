import { useEffect, useState } from 'react';
import { Camera, Cpu, Activity, AlertTriangle, Brain, Server, Globe, TrendingUp, Eye, Settings, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useHardware } from '../hooks/useHardware';
import { useModel } from '../hooks/useModel';
import { useSystemLogs } from '../hooks/useSystemLogs';
import { useCamera } from '../hooks/useCamera';
import { useWebSocket, frigateWS } from '../services/websocket';
import { frigateAPI } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { cn } from '../utils/cn';

interface SystemStatus {
  cameras: {
    total: number;
    online: number;
    offline: number;
    recording: number;
  };
  hardware: {
    accelerators: number;
    active: number;
    temperature: number;
    memory: string;
  };
  models: {
    installed: number;
    available: number;
    active: string;
    accuracy: number;
  };
  system: {
    uptime: string;
    cpu: number;
    memory: number;
    storage: number;
    network: string;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export default function Dashboard() {
  const { dispatch } = useAppContext();
  const { accelerators } = useHardware();
  const { models } = useModel();
  const { statistics } = useSystemLogs();
  const { cameras } = useCamera();
  const { isConnected } = useWebSocket();

  const [apiSystemInfo, setApiSystemInfo] = useState<any>(null);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cameras: {
      total: 8,
      online: 7,
      offline: 1,
      recording: 6
    },
    hardware: {
      accelerators: 2,
      active: 2,
      temperature: 42,
      memory: '2.1GB'
    },
    models: {
      installed: 3,
      available: 7,
      active: 'YOLOv8s',
      accuracy: 74.6
    },
    system: {
      uptime: '2天 14小时 32分钟',
      cpu: 25,
      memory: 65,
      storage: 78,
      network: '正常'
    },
    alerts: {
      total: 12,
      critical: 1,
      warning: 4,
      info: 7
    }
  });

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(actions.setCurrentPage('dashboard'));
  }, [dispatch]);

  // 加载系统信息
  const loadSystemInfo = async () => {
    try {
      const response = await frigateAPI.getSystemInfo();
      if (response.success) {
        setApiSystemInfo(response.data);
      }
    } catch (error) {
      console.error('加载系统信息失败:', error);
    }
  };

  // WebSocket事件处理
  useEffect(() => {
    const handleSystemUpdate = (data: any) => {
      console.log('系统更新:', data);
      loadSystemInfo();
    };

    const handleCameraStatusChange = (data: any) => {
      console.log('摄像头状态变化:', data);
      setSystemStatus(prev => ({
        ...prev,
        cameras: {
          ...prev.cameras,
          online: data.status === 'online' ? prev.cameras.online + 1 : prev.cameras.online - 1,
          offline: data.status === 'offline' ? prev.cameras.offline + 1 : prev.cameras.offline - 1
        }
      }));
    };

    if (isConnected) {
      frigateWS.on('system_status_update', handleSystemUpdate);
      frigateWS.on('camera_status_change', handleCameraStatusChange);
    }

    return () => {
      frigateWS.off('system_status_update', handleSystemUpdate);
      frigateWS.off('camera_status_change', handleCameraStatusChange);
    };
  }, [isConnected]);

  // 初始化加载
  useEffect(() => {
    loadSystemInfo();
  }, []);

  // 更新系统状态
  const updateSystemStatus = () => {
    const onlineCameras = cameras.filter(c => c.status === 'online').length;
    const offlineCameras = cameras.filter(c => c.status === 'offline').length;

    setSystemStatus(prev => ({
      ...prev,
      cameras: {
        total: cameras.length,
        online: onlineCameras,
        offline: offlineCameras,
        recording: Math.floor(onlineCameras * 0.7)
      },
      hardware: {
        accelerators: accelerators.length,
        active: accelerators.filter(a => a.status === 'available').length,
        temperature: 40 + Math.random() * 20,
        memory: `${(1.5 + Math.random() * 2).toFixed(1)}GB`
      },
      models: {
        installed: models.filter(m => m.status === 'installed').length,
        available: models.filter(m => m.status === 'available').length,
        active: models.find(m => m.status === 'installed')?.name || '未安装',
        accuracy: models.find(m => m.status === 'installed')?.accuracy || 0
      },
      alerts: {
        total: statistics?.total || 0,
        critical: statistics?.byLevel?.error || 0,
        warning: statistics?.byLevel?.warning || 0,
        info: statistics?.byLevel?.info || 0
      }
    }));
  };

  useEffect(() => {
    updateSystemStatus();
  }, [accelerators, models, statistics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateSystemStatus();
    setRefreshing(false);
  };

  const stats = [
    {
      title: '摄像头',
      value: `${systemStatus.cameras.online}/${systemStatus.cameras.total}`,
      change: `${systemStatus.cameras.recording} 录制中`,
      changeType: 'positive',
      icon: Camera,
      color: 'bg-blue-500',
      details: [
        { label: '在线', value: systemStatus.cameras.online },
        { label: '离线', value: systemStatus.cameras.offline },
        { label: '录制中', value: systemStatus.cameras.recording }
      ]
    },
    {
      title: '硬件加速',
      value: `${systemStatus.hardware.active}/${systemStatus.hardware.accelerators}`,
      change: `${systemStatus.hardware.temperature.toFixed(1)}°C`,
      changeType: systemStatus.hardware.temperature > 70 ? 'negative' : 'positive',
      icon: Cpu,
      color: 'bg-green-500',
      details: [
        { label: '活动', value: systemStatus.hardware.active },
        { label: '内存', value: systemStatus.hardware.memory },
        { label: '温度', value: `${systemStatus.hardware.temperature.toFixed(1)}°C` }
      ]
    },
    {
      title: 'AI模型',
      value: systemStatus.models.active,
      change: `${systemStatus.models.accuracy.toFixed(1)}% 精度`,
      changeType: 'positive',
      icon: Brain,
      color: 'bg-purple-500',
      details: [
        { label: '已安装', value: systemStatus.models.installed },
        { label: '可用', value: systemStatus.models.available },
        { label: '精度', value: `${systemStatus.models.accuracy.toFixed(1)}%` }
      ]
    },
    {
      title: '系统状态',
      value: '运行中',
      change: `${systemStatus.system.uptime}`,
      changeType: 'positive',
      icon: Activity,
      color: 'bg-emerald-500',
      details: [
        { label: 'CPU', value: `${systemStatus.system.cpu}%` },
        { label: '内存', value: `${systemStatus.system.memory}%` },
        { label: '存储', value: `${systemStatus.system.storage}%` }
      ]
    },
    {
      title: '警报',
      value: systemStatus.alerts.total,
      change: `${systemStatus.alerts.critical} 严重`,
      changeType: systemStatus.alerts.critical > 0 ? 'negative' : 'positive',
      icon: AlertTriangle,
      color: 'bg-red-500',
      details: [
        { label: '严重', value: systemStatus.alerts.critical },
        { label: '警告', value: systemStatus.alerts.warning },
        { label: '信息', value: systemStatus.alerts.info }
      ]
    },
    {
      title: '服务状态',
      value: '正常',
      change: '7/7 服务运行',
      changeType: 'positive',
      icon: Server,
      color: 'bg-indigo-500',
      details: [
        { label: 'Frigate', value: '运行中' },
        { label: 'go2rtc', value: '运行中' },
        { label: 'Web界面', value: '运行中' }
      ]
    }
  ];

  const recentEvents = [
    { time: '2分钟前', type: 'info', message: '摄像头 front_door 检测到人员' },
    { time: '5分钟前', type: 'warning', message: '硬件加速器温度偏高: 75°C' },
    { time: '12分钟前', type: 'info', message: '模型推理完成，用时 45ms' },
    { time: '15分钟前', type: 'error', message: '摄像头 backyard 连接超时' },
    { time: '1小时前', type: 'info', message: '系统备份完成' }
  ];

  const systemInfoItems = [
    { label: 'Frigate版本', value: '0.12.0' },
    { label: '运行时间', value: systemStatus.system.uptime },
    { label: '网络状态', value: systemStatus.system.network },
    { label: '外部访问', value: 'https://frigate.example.com' },
    { label: '最后更新', value: new Date().toLocaleString() }
  ];

  return (
    <div className="p-6">
      {/* 连接状态指示器 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">系统概览</h1>
        <div className="flex items-center space-x-4">
          {/* WebSocket连接状态 */}
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            isConnected
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
          )}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>已连接</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>连接断开</span>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* 统计卡片网格 */}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    stat.color.replace('bg-', 'bg-opacity-10 dark:bg-opacity-20 text-') + stat.color.replace('bg-', 'dark:')
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    stat.changeType === 'positive'
                      ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
                      : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
                  )}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {stat.value}
                </p>
                <div className="space-y-1">
                  {stat.details.map((detail, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{detail.label}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近事件 */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                最近事件
              </h3>
              <Button variant="outline" size="sm">
                <Eye size={14} className="mr-2" />
                查看全部
              </Button>
            </div>
            <div className="space-y-4">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    event.type === 'error' ? "bg-red-500" :
                    event.type === 'warning' ? "bg-yellow-500" :
                    event.type === 'info' ? "bg-blue-500" : "bg-gray-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {event.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* 系统信息 */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                系统信息
              </h3>
              <Globe className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {systemInfoItems.map((info, index) => (
                <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {info.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white text-right">
                    {info.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CPU使用率</span>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${systemStatus.system.cpu}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {systemStatus.system.cpu}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">内存使用</span>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          systemStatus.system.memory > 80 ? "bg-red-500" :
                          systemStatus.system.memory > 60 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${systemStatus.system.memory}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {systemStatus.system.memory}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">存储使用</span>
                  <div className="flex items-center">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${systemStatus.system.storage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {systemStatus.system.storage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <TrendingUp size={14} className="mr-2" />
                性能监控
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Settings size={14} className="mr-2" />
                系统设置
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card className="mt-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            快速操作
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Camera className="w-6 h-6 mb-2" />
              <span className="text-sm">摄像头管理</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Cpu className="w-6 h-6 mb-2" />
              <span className="text-sm">硬件配置</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Brain className="w-6 h-6 mb-2" />
              <span className="text-sm">模型管理</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Globe className="w-6 h-6 mb-2" />
              <span className="text-sm">远程访问</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Activity className="w-6 h-6 mb-2" />
              <span className="text-sm">系统日志</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
              <Settings className="w-6 h-6 mb-2" />
              <span className="text-sm">系统设置</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}