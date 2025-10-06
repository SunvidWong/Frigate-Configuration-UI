import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppContext, actions } from '../../contexts/AppContext';

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { state, dispatch } = useAppContext();
  const { theme } = state.ui;

  // 应用主题到文档
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleMenuClick = () => {
    dispatch(actions.toggleSidebar());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className="lg:ml-64">
        <Header onMenuClick={handleMenuClick} />

        <main className="flex-1">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}