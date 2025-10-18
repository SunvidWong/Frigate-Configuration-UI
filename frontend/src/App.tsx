import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import WizardPage from './pages/WizardPage'
import './App.css'

/**
 * Frigate 配置 UI 主应用组件
 *
 * 根据 FR-007: 中文为主界面语言
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <h1>Frigate 配置与部署</h1>
          <p className="subtitle">快速配置 NVR 监控实例</p>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wizard" element={<WizardPage />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>Frigate Configuration UI v1.0.0</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
