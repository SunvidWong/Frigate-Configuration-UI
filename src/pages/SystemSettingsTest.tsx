
export default function SystemSettingsTest() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1>🔧 系统设置页面</h1>
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px 0'
      }}>
        <h2>✅ 系统设置组件加载成功</h2>
        <p>这是一个简化的系统设置页面测试组件</p>
        <p>当前时间: {new Date().toLocaleString()}</p>
        <p>路由路径: /settings</p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px 0'
      }}>
        <h3>📋 配置选项</h3>
        <ul>
          <li>常规设置</li>
          <li>数据库配置</li>
          <li>通知设置</li>
          <li>安全设置</li>
          <li>性能设置</li>
        </ul>
      </div>

      <button
        onClick={() => alert('系统设置功能正常工作！')}
        style={{
          background: 'white',
          color: '#333',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '10px',
          fontSize: '16px',
          cursor: 'pointer',
          margin: '10px'
        }}
      >
        测试设置功能
      </button>
    </div>
  );
}