import { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Thermometer, Zap, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PerformanceMetrics {
  utilization: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  temperature: number;
  powerUsage: number;
  throughput: {
    fps: number;
    inferenceTime: number;
  };
  errors: number;
}

interface AcceleratorPerformanceProps {
  acceleratorId: string;
  isMonitoring: boolean;
}

export function AcceleratorPerformance({ acceleratorId: _acceleratorId, isMonitoring }: AcceleratorPerformanceProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    utilization: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    temperature: 0,
    powerUsage: 0,
    throughput: { fps: 0, inferenceTime: 0 },
    errors: 0
  });

  const [historicalData, setHistoricalData] = useState<number[]>([]);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // 模拟性能数据
      const newMetrics: PerformanceMetrics = {
        utilization: Math.random() * 100,
        memoryUsage: {
          used: Math.floor(Math.random() * 2048),
          total: 4096,
          percentage: Math.random() * 100
        },
        temperature: 45 + Math.random() * 30,
        powerUsage: 10 + Math.random() * 40,
        throughput: {
          fps: Math.floor(20 + Math.random() * 30),
          inferenceTime: Math.floor(5 + Math.random() * 15)
        },
        errors: Math.floor(Math.random() * 5)
      };

      setMetrics(newMetrics);
      setHistoricalData(prev => [...prev.slice(-19), newMetrics.utilization]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  if (!isMonitoring) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center dark:bg-gray-700">
        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          性能监控已禁用
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 实时指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">利用率</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.utilization.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">内存</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.memoryUsage.percentage.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">温度</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.temperature.toFixed(1)}°C
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">功耗</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.powerUsage.toFixed(1)}W
          </div>
        </div>
      </div>

      {/* 性能趋势图 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          性能趋势
        </h3>
        <div className="h-32 flex items-end space-x-1">
          {historicalData.map((value, index) => (
            <div
              key={index}
              className={cn(
                "flex-1 rounded-t transition-all duration-300",
                value > 80 ? "bg-red-500" :
                value > 60 ? "bg-yellow-500" :
                "bg-green-500"
              )}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>-40s</span>
          <span>现在</span>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          详细指标
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-4 h-4 inline mr-2" />
              处理帧率
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {metrics.throughput.fps} FPS
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4 inline mr-2" />
              推理时间
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {metrics.throughput.inferenceTime}ms
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <HardDrive className="w-4 h-4 inline mr-2" />
              内存使用
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <Thermometer className="w-4 h-4 inline mr-2" />
              错误计数
            </span>
            <span className={cn(
              "text-sm font-medium",
              metrics.errors > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
            )}>
              {metrics.errors}
            </span>
          </div>
        </div>
      </div>

      {/* 性能状态指示器 */}
      <div className={cn(
        "rounded-lg p-3 border",
        metrics.utilization > 80 || metrics.temperature > 75
          ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          : metrics.utilization > 60 || metrics.temperature > 65
          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
          : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
      )}>
        <div className="flex items-center">
          <div className={cn(
            "w-2 h-2 rounded-full mr-2",
            metrics.utilization > 80 || metrics.temperature > 75
              ? "bg-red-500"
              : metrics.utilization > 60 || metrics.temperature > 65
              ? "bg-yellow-500"
              : "bg-green-500"
          )} />
          <span className={cn(
            "text-sm font-medium",
            metrics.utilization > 80 || metrics.temperature > 75
              ? "text-red-700 dark:text-red-400"
              : metrics.utilization > 60 || metrics.temperature > 65
              ? "text-yellow-700 dark:text-yellow-400"
              : "text-green-700 dark:text-green-400"
          )}>
            {metrics.utilization > 80 || metrics.temperature > 75
              ? "性能负载过高"
              : metrics.utilization > 60 || metrics.temperature > 65
              ? "性能负载适中"
              : "性能运行正常"}
          </span>
        </div>
      </div>
    </div>
  );
}