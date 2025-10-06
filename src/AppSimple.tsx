function AppSimple() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#3b82f6' }}>🎯 Frigate 配置管理界面</h1>
      <p style={{ fontSize: '18px', margin: '20px 0' }}>应用正在运行 - 简化版本</p>
      <div style={{
        background: '#f0f0f0',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>功能列表：</h2>
        <ul>
          <li>✅ 系统概览</li>
          <li>✅ 硬件加速器管理</li>
          <li>✅ AI模型管理</li>
          <li>✅ 摄像头管理</li>
          <li>✅ 远程访问配置</li>
          <li>✅ 系统设置</li>
          <li>✅ 系统日志</li>
          <li>✅ 部署管理</li>
        </ul>
      </div>
      <div style={{
        background: '#e6f4ea',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <strong>如果看到这个页面，说明基础功能正常</strong>
      </div>
    </div>
  );
}

export default AppSimple;