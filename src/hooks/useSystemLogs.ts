import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  details?: string;
  metadata?: Record<string, any>;
}

interface LogFilter {
  level: string[];
  source: string[];
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  searchTerm: string;
}

interface LogStatistics {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  timeRange: string;
}

// 模拟真实日志生成器
class LogGenerator {
  private sources = ['frigate', 'camera', 'detection', 'database', 'system', 'network', 'hardware', 'api'];
  private messages = {
    frigate: [
      'Frigate service started successfully',
      'Configuration loaded from /config/config.yml',
      'Camera detection started',
      'Object detection model loaded',
      'Recording started for camera front_door',
      'Motion detected in driveway',
      'Alert sent to webhook',
      'Recording file rotated',
      'System performance check completed',
      'Cache cleared successfully'
    ],
    camera: [
      'Camera front_door connected',
      'Camera backyard disconnected',
      'RTSP stream established',
      'Video stream quality: 1080p',
      'Motion detection enabled',
      'Camera settings updated',
      'Night vision mode activated',
      'Connection timeout, retrying...',
      'Audio stream started',
      'Camera firmware update available'
    ],
    detection: [
      'YOLOv5 model loaded successfully',
      'Detection processing started',
      'Object detected: person (confidence: 0.95)',
      'Multiple objects detected',
      'Detection threshold updated to 0.7',
      'Model inference time: 45ms',
      'GPU acceleration active',
      'Detection zone updated',
      'False positive filtered',
      'Model performance optimized'
    ],
    database: [
      'Database connection established',
      'Recording metadata saved',
      'Event log created',
      'Database backup completed',
      'Cache cleanup in progress',
      'Query executed successfully',
      'Database index rebuilt',
      'Connection pool updated',
      'Storage space check: 78% used',
      'Database migration completed'
    ],
    system: [
      'System startup completed',
      'Memory usage: 2.1GB / 8GB',
      'CPU usage: 15%',
      'Disk space: 120GB free',
      'Network interface up',
      'Service auto-restart triggered',
      'System update available',
      'Temperature normal: 42°C',
      'Power consumption: 65W',
      'Uptime: 2 days, 14 hours'
    ],
    network: [
      'Network connection established',
      'External IP: 203.0.113.1',
      'Port 5000 forwarded successfully',
      'SSL certificate renewed',
      'DNS resolution working',
      'Bandwidth usage: 2.3Mbps',
      'Ping test successful',
      'Network latency: 12ms',
      'Firewall rule updated',
      'VPN connection established'
    ],
    hardware: [
      'NVIDIA GPU detected: RTX 3080',
      'GPU temperature: 65°C',
      'GPU memory usage: 4.2GB / 10GB',
      'Hardware acceleration enabled',
      'USB device connected: Coral TPU',
      'Driver version updated',
      'Thermal throttling detected',
      'GPU fan speed: 60%',
      'Hardware test passed',
      'Device firmware updated'
    ],
    api: [
      'API server started on port 5000',
      'Authentication successful',
      'Rate limit applied',
      'API request processed',
      'WebSocket connection established',
      'User session created',
      'API key validated',
      'Request timeout: 30s',
      'Cache hit ratio: 85%',
      'API documentation updated'
    ]
  };

  generateLogEntry(source?: string, level?: string): LogEntry {
    const now = new Date();
    const randomSource = source || this.sources[Math.floor(Math.random() * this.sources.length)];
    const possibleLevels = level ? [level] : ['info', 'warning', 'error', 'debug'];
    const randomLevel = possibleLevels[Math.floor(Math.random() * possibleLevels.length)] as LogEntry['level'];

    const sourceMessages = this.messages[randomSource as keyof typeof this.messages];
    const randomMessage = sourceMessages[Math.floor(Math.random() * sourceMessages.length)];

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now.toISOString(),
      level: randomLevel,
      source: randomSource,
      message: randomMessage,
      metadata: {
        threadId: Math.floor(Math.random() * 8) + 1,
        processId: Math.floor(Math.random() * 1000) + 1000,
        hostname: 'frigate-server'
      }
    };

    // 为某些日志添加详细信息
    if (Math.random() > 0.7) {
      entry.details = this.generateDetails(randomSource, randomLevel);
    }

    return entry;
  }

  private generateDetails(source: string, level: string): string {
    const details = {
      frigate: {
        info: [
          'Configuration file path: /config/config.yml',
          'Version: 0.12.0',
          'Process ID: 1234'
        ],
        warning: [
          'High CPU usage detected: 85%',
          'Memory usage approaching limit: 7.8GB/8GB'
        ],
        error: [
          'Failed to connect to camera: timeout after 30 seconds',
          'Model loading failed: insufficient GPU memory'
        ]
      },
      camera: {
        info: [
          'Stream resolution: 1920x1080',
          'Frame rate: 30fps',
          'Codec: H.264'
        ],
        warning: [
          'Stream quality degraded: low bandwidth',
          'Audio synchronization issue detected'
        ],
        error: [
          'Camera authentication failed',
          'RTSP connection lost'
        ]
      },
      detection: {
        info: [
          'Model: YOLOv5s',
          'Input size: 640x640',
          'Confidence threshold: 0.5'
        ],
        warning: [
          'Detection confidence below threshold',
          'Model performance degradation detected'
        ],
        error: [
          'Model inference failed: CUDA out of memory',
          'Invalid input tensor shape'
        ]
      }
    };

    const sourceDetails = details[source as keyof typeof details];
    if (sourceDetails && sourceDetails[level as keyof typeof sourceDetails]) {
      const levelDetails = sourceDetails[level as keyof typeof sourceDetails];
      return levelDetails[Math.floor(Math.random() * levelDetails.length)];
    }

    return `Additional context for ${level} message from ${source}`;
  }
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>({
    level: [],
    source: [],
    timeRange: '1h',
    searchTerm: ''
  });
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const intervalRef = useRef<number | null>(null);
  const logGenerator = new LogGenerator();

  // 生成初始日志
  const generateInitialLogs = (count: number = 100): LogEntry[] => {
    const initialLogs: LogEntry[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // 每条日志间隔1分钟
      const entry = logGenerator.generateLogEntry();
      entry.timestamp = timestamp.toISOString();
      initialLogs.unshift(entry);
    }

    return initialLogs;
  };

  // 加载日志
  const loadLogs = async (applyFilter: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 生成新的日志条目
      let newLogs: LogEntry[] = generateInitialLogs(200);

      // 如果是实时模式，添加一些最新的日志
      if (isLiveMode) {
        const recentLogs = Array.from({ length: 10 }, () => logGenerator.generateLogEntry());
        newLogs = [...recentLogs, ...newLogs];
      }

      // 应用过滤器
      if (applyFilter) {
        newLogs = applyFilters(newLogs, filter);
      }

      setLogs(newLogs);
      updateStatistics(newLogs);

    } catch (err) {
      setError('加载日志失败');
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // 应用过滤器
  const applyFilters = (logEntries: LogEntry[], currentFilter: LogFilter): LogEntry[] => {
    let filtered = logEntries;

    // 时间范围过滤
    if (currentFilter.timeRange) {
      const now = new Date();
      const cutoff = new Date();

      switch (currentFilter.timeRange) {
        case '1h':
          cutoff.setHours(now.getHours() - 1);
          break;
        case '6h':
          cutoff.setHours(now.getHours() - 6);
          break;
        case '24h':
          cutoff.setDate(now.getDate() - 1);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter(log => new Date(log.timestamp) >= cutoff);
    }

    // 日志级别过滤
    if (currentFilter.level.length > 0) {
      filtered = filtered.filter(log => currentFilter.level.includes(log.level));
    }

    // 来源过滤
    if (currentFilter.source.length > 0) {
      filtered = filtered.filter(log => currentFilter.source.includes(log.source));
    }

    // 搜索词过滤
    if (currentFilter.searchTerm) {
      const searchLower = currentFilter.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.details && log.details.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  };

  // 更新统计信息
  const updateStatistics = (logEntries: LogEntry[]) => {
    const stats: LogStatistics = {
      total: logEntries.length,
      byLevel: {},
      bySource: {},
      timeRange: filter.timeRange
    };

    logEntries.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    });

    setStatistics(stats);
  };

  // 导出日志
  const exportLogs = (format: 'json' | 'csv' | 'txt') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(logs, null, 2);
        filename = `frigate-logs-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
      case 'csv':
        const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Details'];
        const csvRows = [
          headers.join(','),
          ...logs.map(log => [
            log.timestamp,
            log.level,
            log.source,
            `"${log.message.replace(/"/g, '""')}"`,
            `"${(log.details || '').replace(/"/g, '""')}"`
          ].join(','))
        ];
        content = csvRows.join('\n');
        filename = `frigate-logs-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
      case 'txt':
        content = logs.map(log =>
          `[${log.timestamp}] ${log.level.toUpperCase()} ${log.source}: ${log.message}${log.details ? '\n  Details: ' + log.details : ''}`
        ).join('\n');
        filename = `frigate-logs-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清除日志
  const clearLogs = async () => {
    try {
      setLogs([]);
      setStatistics(null);
    } catch (err) {
      setError('清除日志失败');
    }
  };

  // 更新过滤器
  const updateFilter = (newFilter: Partial<LogFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);

    // 重新应用过滤器
    const filteredLogs = applyFilters(logs, updatedFilter);
    setLogs(filteredLogs);
    updateStatistics(filteredLogs);
  };

  // 搜索日志
  const searchLogs = (query: string) => {
    updateFilter({ searchTerm: query });
  };

  // 实时模式切换
  const toggleLiveMode = (enabled: boolean) => {
    setIsLiveMode(enabled);

    if (enabled) {
      startLiveMode();
    } else {
      stopLiveMode();
    }
  };

  // 启动实时模式
  const startLiveMode = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const newLog = logGenerator.generateLogEntry();

      setLogs(prev => {
        const updated = [newLog, ...prev];
        const filtered = applyFilters(updated, filter);
        updateStatistics(filtered);
        return filtered;
      });
    }, 2000 + Math.random() * 3000); // 随机间隔2-5秒
  };

  // 停止实时模式
  const stopLiveMode = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 刷新日志
  const refreshLogs = () => {
    loadLogs(true);
  };

  // 初始化
  useEffect(() => {
    loadLogs();

    return () => {
      stopLiveMode();
    };
  }, []);

  // 实时模式管理
  useEffect(() => {
    if (isLiveMode) {
      startLiveMode();
    } else {
      stopLiveMode();
    }

    return () => {
      stopLiveMode();
    };
  }, [isLiveMode]);

  return {
    logs,
    loading,
    error,
    filter,
    statistics,
    isLiveMode,
    loadLogs,
    updateFilter,
    searchLogs,
    exportLogs,
    clearLogs,
    refreshLogs,
    toggleLiveMode
  };
}