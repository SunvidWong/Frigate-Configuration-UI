import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Cpu,
  Camera,
  Brain,
  Settings,
  Globe,
  Play,
  X,
  Sun,
  Moon,
  FileText
} from 'lucide-react';
import { useAppContext, actions } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: Home, path: '/' },
  { id: 'hardware', label: '硬件加速器', icon: Cpu, path: '/hardware' },
  { id: 'cameras', label: '摄像头管理', icon: Camera, path: '/cameras' },
  { id: 'models', label: 'AI 模型', icon: Brain, path: '/models' },
  { id: 'deployment', label: '部署管理', icon: Play, path: '/deployment' },
  { id: 'remote', label: '远程访问', icon: Globe, path: '/remote' },
  { id: 'logs', label: '系统日志', icon: FileText, path: '/logs' },
  { id: 'settings', label: '系统设置', icon: Settings, path: '/settings' }
];

export function Sidebar() {
  const location = useLocation();
  const { state, dispatch } = useAppContext();
  const { sidebarOpen, theme } = state.ui;

  const toggleSidebar = () => {
    dispatch(actions.toggleSidebar());
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    dispatch(actions.setTheme(newTheme));
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside className={cn(
        'fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50 dark:bg-gray-800 dark:border-gray-700',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* 头部 */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Frigate UI
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      // 移动端点击后关闭侧边栏
                      if (window.innerWidth < 1024) {
                        dispatch(actions.toggleSidebar());
                      }
                    }}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon
                      size={20}
                      className={cn(
                        'mr-3 flex-shrink-0',
                        isActive
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              版本 1.0.0
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
              title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}