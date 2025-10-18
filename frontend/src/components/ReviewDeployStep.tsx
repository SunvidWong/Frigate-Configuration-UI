import { useState } from 'react'
import './StepCommon.css'

interface WizardData {
  hardware: {
    instanceName: string
    hwMode: string
    hwDevice: string
  }
  cameras: Array<{
    id: string
    name: string
    ip: string
    username: string
    password: string
    brand: string
  }>
}

interface ReviewDeployStepProps {
  wizardData: WizardData
  onPrevious: () => void
}

/**
 * 复核部署步骤组件
 *
 * 根据 FR-013: 显示完整配置摘要
 * 根据 FR-014: 触发部署流程
 */
function ReviewDeployStep({ wizardData, onPrevious }: ReviewDeployStepProps) {
  const [deploying, setDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<{
    status: 'idle' | 'deploying' | 'success' | 'error'
    message: string
  }>({
    status: 'idle',
    message: '',
  })

  const hwModeLabels: Record<string, string> = {
    cpu: 'CPU（通用）',
    nvidia: 'NVIDIA GPU',
    hailo: 'Hailo NPU',
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployStatus({
      status: 'deploying',
      message: '正在部署实例...',
    })

    try {
      // TODO: 调用后端 API 部署实例
      const response = await fetch('/api/instances/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_name: wizardData.hardware.instanceName,
          hw_mode: wizardData.hardware.hwMode,
          hw_device: wizardData.hardware.hwDevice,
          cameras: wizardData.cameras.map((cam) => ({
            name: cam.name,
            ip: cam.ip,
            username: cam.username,
            password: cam.password,
            brand: cam.brand,
          })),
        }),
      })

      if (response.ok) {
        setDeployStatus({
          status: 'success',
          message: '实例部署成功！正在启动容器...',
        })
      } else {
        const error = await response.json()
        setDeployStatus({
          status: 'error',
          message: `部署失败: ${error.detail || '未知错误'}`,
        })
      }
    } catch (error: any) {
      setDeployStatus({
        status: 'error',
        message: `部署失败: ${error.message}`,
      })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="step-content">
      <h2>复核部署</h2>
      <p className="step-subtitle">检查配置信息，确认无误后部署实例</p>

      <div className="config-summary">
        <h3>硬件配置</h3>
        <div className="config-item">
          <span className="config-label">实例名称</span>
          <span className="config-value">{wizardData.hardware.instanceName}</span>
        </div>
        <div className="config-item">
          <span className="config-label">硬件加速模式</span>
          <span className="config-value">
            {hwModeLabels[wizardData.hardware.hwMode]}
          </span>
        </div>
        {wizardData.hardware.hwDevice && (
          <div className="config-item">
            <span className="config-label">设备路径</span>
            <span className="config-value">{wizardData.hardware.hwDevice}</span>
          </div>
        )}
      </div>

      <div className="config-summary">
        <h3>摄像头配置</h3>
        {wizardData.cameras.map((camera, index) => (
          <div key={camera.id} style={{ marginBottom: '1rem' }}>
            <div className="config-item">
              <span className="config-label">摄像头 {index + 1}</span>
              <span className="config-value">{camera.name}</span>
            </div>
            <div className="config-item">
              <span className="config-label">IP 地址</span>
              <span className="config-value">{camera.ip}</span>
            </div>
            <div className="config-item">
              <span className="config-label">品牌</span>
              <span className="config-value">{camera.brand}</span>
            </div>
          </div>
        ))}
      </div>

      {deployStatus.status !== 'idle' && (
        <div
          className={`deploy-status ${
            deployStatus.status === 'success'
              ? 'success'
              : deployStatus.status === 'error'
              ? 'error'
              : ''
          }`}
        >
          {deployStatus.message}
        </div>
      )}

      <div className="step-actions">
        <button
          className="btn btn-secondary"
          onClick={onPrevious}
          disabled={deploying}
        >
          上一步
        </button>
        <button
          className="btn btn-primary"
          onClick={handleDeploy}
          disabled={deploying || deployStatus.status === 'success'}
        >
          {deploying ? '部署中...' : '开始部署'}
        </button>
      </div>
    </div>
  )
}

export default ReviewDeployStep
