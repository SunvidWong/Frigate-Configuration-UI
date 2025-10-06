import { Menu, Bell } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title = 'Frigate Configuration UI' }: HeaderProps) {
  const { state } = useAppContext();
  const { notifications } = state.ui;

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* 左侧 */}
        <div className="flex items-center space-x-4">
          {/* 移动端菜单按钮 */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <Menu size={20} />
          </button>

          {/* 页面标题 */}
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
        </div>

        {/* 右侧 */}
        <div className="flex items-center space-x-4">
          {/* 通知按钮 */}
          <button className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700">
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* 系统状态 */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="系统运行正常" />
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
              运行中
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}