import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInstances, deleteInstance, stopInstance, startInstance } from '../services/api'
import './Dashboard.css'

/**
 * Dashboard 页面 - 实例列表管理
 *
 * 根据 T060: 显示所有实例并提供管理操作
 */
function Dashboard() {
  const [instances, setInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadInstances()
  }, [])

  const loadInstances = async () => {
    try {
      setLoading(true)
      const data = await listInstances()
      setInstances(data)
    } catch (error: any) {
      console.error('加载实例列表失败:', error)
      alert(`加载失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async (name: string) => {
    try {
      await startInstance(name)
      alert(`实例 ${name} 已启动`)
      loadInstances()
    } catch (error: any) {
      alert(`启动失败: ${error.message}`)
    }
  }

  const handleStop = async (name: string) => {
    try {
      await stopInstance(name)
      alert(`实例 ${name} 已停止`)
      loadInstances()
    } catch (error: any) {
      alert(`停止失败: ${error.message}`)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除实例 "${name}" 吗？此操作无法撤销。`)) {
      return
    }

    try {
      await deleteInstance(name)
      alert(`实例 ${name} 已删除`)
      loadInstances()
    } catch (error: any) {
      alert(`删除失败: ${error.message}`)
    }
  }

  const handleCreateNew = () => {
    navigate('/wizard')
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>实例管理</h1>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          + 创建新实例
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="empty-state">
          <p>暂无实例</p>
          <p className="help-text">点击"创建新实例"按钮开始配置您的第一个 Frigate 实例</p>
        </div>
      ) : (
        <div className="instances-grid">
          {instances.map((instance) => (
            <div key={instance.name} className="instance-card">
              <div className="instance-header">
                <h3>{instance.name}</h3>
                <span className={`status-badge ${instance.status}`}>
                  {instance.status === 'running' ? '运行中' : '已停止'}
                </span>
              </div>

              <div className="instance-info">
                <div className="info-item">
                  <span className="label">容器 ID:</span>
                  <span className="value">{instance.container_id}</span>
                </div>
                <div className="info-item">
                  <span className="label">镜像:</span>
                  <span className="value">{instance.image || 'frigate:stable'}</span>
                </div>
                <div className="info-item">
                  <span className="label">创建时间:</span>
                  <span className="value">
                    {instance.created ? new Date(instance.created).toLocaleString('zh-CN') : '-'}
                  </span>
                </div>
              </div>

              <div className="instance-actions">
                {instance.status === 'running' ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleStop(instance.name)}
                  >
                    停止
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleStart(instance.name)}
                  >
                    启动
                  </button>
                )}

                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(instance.name)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
