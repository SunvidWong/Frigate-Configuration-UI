import { useEffect, useState, useRef } from 'react';
import { FileText, Download, RefreshCw, Search, Filter, AlertCircle, Info, AlertTriangle, Trash2, Settings } from 'lucide-react';
import { useAppContext, actions } from '../contexts/AppContext';
import { useSystemLogs } from '../hooks/useSystemLogs';
import { Button } from '../components/common/Button';
import { cn } from '../utils/cn';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  details?: string;
  metadata?: Record<string, any>;
}


const logLevels = {
  info: { label: '信息', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', icon: Info },
  warning: { label: '警告', color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20', icon: AlertTriangle },
  error: { label: '错误', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20', icon: AlertCircle },
  debug: { label: '调试', color: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20', icon: FileText }
};

const logSources = [
  'frigate',
  'camera',
  'detection',
  'database',
  'system',
  'network',
  'hardware',
  'api'
];

export default function SystemLogs() {
  const { dispatch } = useAppContext();
  const {
    logs,
    loading,
    loadLogs,
    filter,
    updateFilter,
    exportLogs,
    clearLogs
  } = useSystemLogs();
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(actions.setCurrentPage('logs'));
    loadLogs();
  }, [dispatch]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter]);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const scrollToBottom = () => {
    if (isLive && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  
  const filteredLogs = logs.filter(log => {
    if (filter.level.length > 0 && !filter.level.includes(log.level)) return false;
    if (filter.source.length > 0 && !filter.source.includes(log.source)) return false;
    if (filter.searchTerm && !log.message.toLowerCase().includes(filter.searchTerm.toLowerCase())) return false;
    return true;
  });

  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            系统日志
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            查看和管理系统运行日志
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className={cn("mr-2", showFilters && "text-blue-600")} />
            筛选
          </Button>
          <Button
            variant="secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && "text-blue-600")}
          >
            <RefreshCw size={16} className={cn("mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportLogs('json')}
          >
            <Download size={16} className="mr-2" />
            导出
          </Button>
          <Button
            variant="danger"
            onClick={clearLogs}
          >
            <Trash2 size={16} className="mr-2" />
            清空
          </Button>
        </div>
      </div>

      {/* 过滤器面板 */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            日志筛选
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                搜索关键词
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filter.searchTerm}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  placeholder="搜索日志内容..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>

            {/* 日志级别 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                日志级别
              </label>
              <select
                multiple
                value={filter.level}
                onChange={(e) => updateFilter({ level: Array.from(e.target.selectedOptions, option => option.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                size={4}
              >
                {Object.entries(logLevels).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            {/* 日志来源 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                日志来源
              </label>
              <select
                multiple
                value={filter.source}
                onChange={(e) => updateFilter({ source: Array.from(e.target.selectedOptions, option => option.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                size={4}
              >
                {logSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* 时间范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                时间范围
              </label>
              <select
                value={filter.timeRange}
                onChange={(e) => updateFilter({ timeRange: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="1h">最近1小时</option>
                <option value="6h">最近6小时</option>
                <option value="24h">最近24小时</option>
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              显示 {filteredLogs.length} 条日志，共 {logs.length} 条
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className={cn(isLive && "text-green-600")}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", isLive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                {isLive ? '实时模式' : '历史模式'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateFilter({ level: [], source: [], timeRange: '1h', searchTerm: '' })}
              >
                重置筛选
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  级别
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  来源
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  消息
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-400">
                        加载日志中...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        没有找到日志
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {logs.length === 0 ? '系统还没有生成日志' : '没有符合条件的日志'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const LevelIcon = logLevels[log.level].icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          logLevels[log.level].color
                        )}>
                          <LevelIcon className="w-3 h-3 mr-1" />
                          {logLevels[log.level].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {log.source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-md">
                        <div className="truncate" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Settings size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 自动滚动锚点 */}
        <div ref={logsEndRef} />
      </div>

      {/* 日志详情模态框 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                日志详情
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间</span>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatTimestamp(selectedLog.timestamp)}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">级别</span>
                  <div className="mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      logLevels[selectedLog.level].color
                    )}>
                      {logLevels[selectedLog.level].label}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">来源</span>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {selectedLog.source}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">消息</span>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {selectedLog.message}
                  </p>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">详细信息</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedLog.details}
                    </p>
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">元数据</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                    <pre className="text-xs text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={() => setSelectedLog(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}