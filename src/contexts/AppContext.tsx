import { createContext, useContext, useReducer, type ReactNode } from 'react';

// 状态类型定义
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  currentPage: string;
  loading: boolean;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
}

interface AppState {
  ui: UIState;
  config: any; // Frigate配置
  system: {
    status: 'online' | 'offline' | 'warning';
    version: string;
    uptime: number;
  };
}

// Action类型定义
type AppAction =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CURRENT_PAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'UPDATE_CONFIG'; payload: any }
  | { type: 'UPDATE_SYSTEM_STATUS'; payload: Partial<AppState['system']> };

// 初始状态
const initialState: AppState = {
  ui: {
    sidebarOpen: false,
    theme: 'light',
    currentPage: 'dashboard',
    loading: false,
    notifications: [],
  },
  config: {},
  system: {
    status: 'online',
    version: '1.0.0',
    uptime: 0,
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen,
        },
      };

    case 'SET_THEME':
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };

    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          currentPage: action.payload,
        },
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              ...action.payload,
              id: Date.now().toString(),
              timestamp: Date.now(),
            },
          ],
        },
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload),
        },
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: action.payload,
      };

    case 'UPDATE_SYSTEM_STATUS':
      return {
        ...state,
        system: {
          ...state.system,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Actions
export const actions = {
  toggleSidebar: () => ({ type: 'TOGGLE_SIDEBAR' as const }),
  setTheme: (theme: 'light' | 'dark') => ({ type: 'SET_THEME' as const, payload: theme }),
  setCurrentPage: (page: string) => ({ type: 'SET_CURRENT_PAGE' as const, payload: page }),
  setLoading: (loading: boolean) => ({ type: 'SET_LOADING' as const, payload: loading }),
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) =>
    ({ type: 'ADD_NOTIFICATION' as const, payload: notification }),
  removeNotification: (id: string) => ({ type: 'REMOVE_NOTIFICATION' as const, payload: id }),
  updateConfig: (config: any) => ({ type: 'UPDATE_CONFIG' as const, payload: config }),
  updateSystemStatus: (status: Partial<AppState['system']>) =>
    ({ type: 'UPDATE_SYSTEM_STATUS' as const, payload: status }),
};