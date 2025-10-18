import { useState, useEffect } from 'react'
import './StepCommon.css'

interface HardwareData {
  instanceName: string
  hwMode: string
  hwDevice: string
}

interface HardwareConfigStepProps {
  data: HardwareData
  onUpdate: (data: HardwareData) => void
  onNext: () => void
}

/**
 * 硬件配置步骤组件
 *
 * 根据 FR-009: 实例名称校验（小写字母开头，仅包含小写字母、数字和连字符）
 * 根据 FR-010: 硬件加速选项（CPU/NVIDIA/Hailo）
 */
function HardwareConfigStep({ data, onUpdate, onNext }: HardwareConfigStepProps) {
  const [instanceName, setInstanceName] = useState(data.instanceName)
  const [hwMode, setHwMode] = useState(data.hwMode)
  const [hwDevice, setHwDevice] = useState(data.hwDevice)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    onUpdate({ instanceName, hwMode, hwDevice })
  }, [instanceName, hwMode, hwDevice])

  const validateInstanceName = (name: string): string | null => {
    if (!name) {
      return '实例名称不能为空'
    }

    // FR-009: ^[a-z][a-z0-9-]{2,31}$
    const regex = /^[a-z][a-z0-9-]{2,31}$/
    if (!regex.test(name)) {
      return '名称必须符合格式：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符'
    }

    return null
  }

  const handleNext = () => {
    const nameError = validateInstanceName(instanceName)
    if (nameError) {
      setErrors({ instanceName: nameError })
      return
    }

    setErrors({})
    onNext()
  }

  return (
    <div className="step-content">
      <h2>硬件配置</h2>
      <p className="step-subtitle">配置 Frigate 实例的基本信息和硬件加速</p>

      <div className="form-group">
        <label htmlFor="instanceName">
          实例名称 <span className="required">*</span>
        </label>
        <input
          type="text"
          id="instanceName"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value.toLowerCase())}
          placeholder="例如: camera-front"
          className={errors.instanceName ? 'error' : ''}
        />
        {errors.instanceName && (
          <div className="error-message">{errors.instanceName}</div>
        )}
        <div className="help-text">
          小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="hwMode">
          硬件加速模式 <span className="required">*</span>
        </label>
        <select
          id="hwMode"
          value={hwMode}
          onChange={(e) => setHwMode(e.target.value)}
        >
          <option value="cpu">CPU（通用）</option>
          <option value="nvidia">NVIDIA GPU（需要 NVIDIA Container Toolkit）</option>
          <option value="hailo">Hailo NPU（需要 Hailo 驱动）</option>
        </select>
        <div className="help-text">
          根据硬件配置选择加速模式，不可用时会自动降级为 CPU 模式
        </div>
      </div>

      {hwMode !== 'cpu' && (
        <div className="form-group">
          <label htmlFor="hwDevice">设备路径（可选）</label>
          <input
            type="text"
            id="hwDevice"
            value={hwDevice}
            onChange={(e) => setHwDevice(e.target.value)}
            placeholder={
              hwMode === 'nvidia' ? '例如: /dev/nvidia0' : '例如: /dev/hailo0'
            }
          />
          <div className="help-text">留空则使用默认设备</div>
        </div>
      )}

      <div className="step-actions">
        <button className="btn btn-primary" onClick={handleNext}>
          下一步
        </button>
      </div>
    </div>
  )
}

export default HardwareConfigStep
