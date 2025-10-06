import { useEffect, useState } from 'react';
import { Play, Square, RefreshCw, AlertTriangle, Download, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';

interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  image: string;
  port: number;
  memory: string;
  cpu: string;
  uptime?: string;
  lastRestart?: string;
  logs?: string[];
}


export default function DeploymentManagement() {
  const { dispatch } = useAppContext();
  const [services, setServices] = useState<Service[]>([
    {
      id: 'frigate',
      name: 'Frigate',
      status: 'running',
      image: 'frigate/frigate:stable',
      port: 5000,
      memory: '512MB',
      cpu: '25%',
      uptime: '2d 14h 32m',
      lastRestart: '2024-10-03 08:30:00'
    },
    {
      id: 'go2rtc',
      name: 'go2rtc',
      status: 'running',
      image: 'alexxa/go2rtc:latest',
      port: 1984,
      memory: '128MB',
      cpu: '5%',
      uptime: '2d 14h 35m',
      lastRestart: '2024-10-03 08:27:00'
    },
    {
      id: 'nginx',
      name: 'Nginx Proxy',
      status: 'stopped',
      image: 'nginx:alpine',
      port: 80,
      memory: '64MB',
      cpu: '0%'
    },
    {
      id: 'ddns-go',
      name: 'DDNS-Go',
      status: 'error',
      image: 'jeessy/ddns-go',
      port: 9876,
      memory: '32MB',
      cpu: '0%',
      lastRestart: '2024-10-05 10:15:00'
    }
  ]);

  const [loading] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    dispatch(actions.setCurrentPage('deployment'));
  }, [dispatch]);

  const handleStartService = async (serviceId: string) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId ? { ...service, status: 'starting' as const } : service
    ));

    // 模拟启动过程
    setTimeout(() => {
      setServices(prev => prev.map(service =>
        service.id === serviceId
          ? {
              ...service,
              status: 'running' as const,
              uptime: '刚刚启动',
              lastRestart: new Date().toLocaleString()
            }
          : service
      ));
    }, 3000);
  };

  const handleStopService = async (serviceId: string) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId ? { ...service, status: 'stopping' as const } : service
    ));

    setTimeout(() => {
      setServices(prev => prev.map(service =>
        service.id === serviceId
          ? {
              ...service,
              status: 'stopped' as const,
              uptime: undefined,
              cpu: '0%',
              memory: '0MB'
            }
          : service
      ));
    }, 2000);
  };

  const handleRestartService = async (serviceId: string) => {
    await handleStopService(serviceId);
    setTimeout(() => handleStartService(serviceId), 2500);
  };

  const handleDeploy = async () => {
    setDeploying(true);

    // 模拟部署过程
    setTimeout(() => {
      setDeploying(false);
      alert('部署完成！');
    }, 5000);
  };

  const handleViewLogs = (serviceId: string) => {
    // 模拟日志内容
    const mockLogs = [
      `[${new Date().toISOString()}] INFO: Starting ${serviceId} service...`,
      `[${new Date().toISOString()}] INFO: Loading configuration from /config/config.yml`,
      `[${new Date().toISOString()}] INFO: Hardware acceleration detected: NVIDIA GPU`,
      `[${new Date().toISOString()}] INFO: Camera 1 connected successfully`,
      `[${new Date().toISOString()}] INFO: Model loaded: yolov5n.pt`,
      `[${new Date().toISOString()}] INFO: Web server started on port 5000`,
      `[${new Date().toISOString()}] INFO: Service ready`
    ];

    setServices(prev => prev.map(service =>
      service.id === serviceId ? { ...service, logs: mockLogs } : service
    ));
    setShowLogs(serviceId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'stopped':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'starting':
      case 'stopping':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'stopped':
        return '已停止';
      case 'error':
        return '错误';
      case 'starting':
        return '启动中';
      case 'stopping':
        return '停止中';
      default:
        return '未知';
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            部署管理
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            管理Docker容器部署和服务状态
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" disabled={loading}>
            <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
            刷新状态
          </Button>
          <Button onClick={handleDeploy} disabled={deploying} loading={deploying}>
            <Play size={16} className="mr-2" />
            {deploying ? '部署中...' : '一键部署'}
          </Button>
        </div>
      </div>

      {/* 服务状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">运行中</p>
              <p className="text-2xl font-bold text-green-600">
                {services.filter(s => s.status === 'running').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已停止</p>
              <p className="text-2xl font-bold text-red-600">
                {services.filter(s => s.status === 'stopped').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">错误</p>
              <p className="text-2xl font-bold text-red-600">
                {services.filter(s => s.status === 'error').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总内存</p>
              <p className="text-2xl font-bold text-blue-600">
                {services.reduce((total, service) => {
                  const memory = parseFloat(service.memory) || 0;
                  return total + memory;
                }, 0).toFixed(0)}MB
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 服务列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            服务列表
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  服务
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  镜像
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  资源使用
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  运行时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        端口: {service.port}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        {getStatusText(service.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {service.image}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      CPU: {service.cpu}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      内存: {service.memory}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {service.uptime || '-'}
                    </div>
                    {service.lastRestart && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        重启: {service.lastRestart}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLogs(service.id)}
                        title="查看日志"
                      >
                        <Eye size={16} />
                      </Button>

                      {service.status === 'running' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestartService(service.id)}
                            title="重启"
                          >
                            <RefreshCw size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStopService(service.id)}
                            className="text-red-600 hover:text-red-700"
                            title="停止"
                          >
                            <Square size={16} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartService(service.id)}
                          className="text-green-600 hover:text-green-700"
                          title="启动"
                          disabled={service.status === 'starting' || service.status === 'stopping'}
                        >
                          <Play size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 日志弹窗 */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                服务日志 - {services.find(s => s.id === showLogs)?.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(null)}
              >
                <XCircle size={16} />
              </Button>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="text-green-400 text-sm font-mono">
                {services.find(s => s.id === showLogs)?.logs?.join('\n') || '暂无日志'}
              </pre>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <Button variant="secondary" size="sm">
                  <Download size={16} className="mr-1" />
                  下载日志
                </Button>
                <Button variant="secondary" size="sm">
                  <RefreshCw size={16} className="mr-1" />
                  刷新
                </Button>
              </div>
              <Button variant="secondary" onClick={() => setShowLogs(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}