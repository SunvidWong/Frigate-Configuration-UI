import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import HardwareAccelerator from './pages/HardwareAccelerator';
import CameraManagement from './pages/CameraManagement';
import ModelManagement from './pages/ModelManagement';
import DeploymentManagement from './pages/DeploymentManagement';
import RemoteAccess from './pages/RemoteAccess';
import SystemSettingsFixed from './pages/SystemSettingsFixed';
import SystemLogs from './pages/SystemLogs';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hardware" element={<HardwareAccelerator />} />
          <Route path="/cameras" element={<CameraManagement />} />
          <Route path="/models" element={<ModelManagement />} />
          <Route path="/deployment" element={<DeploymentManagement />} />
          <Route path="/remote" element={<RemoteAccess />} />
          <Route path="/settings" element={<SystemSettingsFixed />} />
          <Route path="/logs" element={<SystemLogs />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;