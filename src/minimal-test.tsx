
export default function MinimalTest() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ fontSize: '3em', margin: '0 0 20px 0' }}>
          🎉 React应用运行成功！
        </h1>
        <p style={{ fontSize: '1.2em', margin: '0 0 30px 0' }}>
          这是一个极简的React测试组件
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.3)',
          padding: '20px',
          borderRadius: '10px',
          margin: '20px 0'
        }}>
          <h3>✅ 功能确认</h3>
          <p>React组件渲染正常</p>
          <p>样式应用正常</p>
          <p>JavaScript执行正常</p>
        </div>
        <button
          onClick={() => alert('React事件处理正常工作！')}
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
          测试React事件
        </button>
        <div style={{ marginTop: '30px', fontSize: '0.9em', opacity: 0.8 }}>
          <p>当前时间: {new Date().toLocaleString()}</p>
          <p>用户代理: {typeof window !== 'undefined' ? navigator.userAgent : '服务器端渲染'}</p>
        </div>
      </div>
    </div>
  );
}
