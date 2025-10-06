
export default function SimpleTest() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{
          color: '#333',
          margin: '0 0 20px 0',
          fontSize: '2.5em'
        }}>
          🎉 测试成功！
        </h1>
        <p style={{
          color: '#666',
          margin: '0 0 30px 0',
          fontSize: '1.2em'
        }}>
          React应用正在端口5121上正常运行
        </p>
        <div style={{
          background: '#f0f0f0',
          padding: '20px',
          borderRadius: '10px',
          margin: '20px 0'
        }}>
          <h3>系统信息</h3>
          <p><strong>端口:</strong> 5121</p>
          <p><strong>时间:</strong> {new Date().toLocaleString()}</p>
          <p><strong>用户代理:</strong> {navigator.userAgent}</p>
        </div>
        <button
          onClick={() => alert('按钮点击正常工作！')}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          测试按钮
        </button>
      </div>
    </div>
  );
}