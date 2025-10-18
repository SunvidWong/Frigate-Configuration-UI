import { useState } from 'react'
import './StepCommon.css'

interface Camera {
  id: string
  name: string
  ip: string
  username: string
  password: string
  brand: string
}

interface CameraConfigStepProps {
  cameras: Camera[]
  onUpdate: (cameras: Camera[]) => void
  onNext: () => void
  onPrevious: () => void
}

/**
 * 摄像头配置步骤组件
 *
 * 根据 FR-011: 摄像头名称校验（同实例名称规则）
 * 根据 FR-012: 品牌模板支持
 */
function CameraConfigStep({
  cameras,
  onUpdate,
  onNext,
  onPrevious,
}: CameraConfigStepProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCamera, setNewCamera] = useState<Partial<Camera>>({
    name: '',
    ip: '',
    username: 'admin',
    password: '',
    brand: 'generic',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const brandTemplates = [
    { value: 'generic', label: '通用 RTSP' },
    { value: 'hikvision', label: '海康威视' },
    { value: 'dahua', label: '大华' },
    { value: 'uniview', label: '宇视' },
    { value: 'other', label: '其他品牌' },
  ]

  const validateCameraName = (name: string): string | null => {
    if (!name) {
      return '摄像头名称不能为空'
    }

    const regex = /^[a-z][a-z0-9-]{2,31}$/
    if (!regex.test(name)) {
      return '名称必须符合格式：小写字母开头，仅包含小写字母、数字和连字符，长度 3-32 字符'
    }

    if (cameras.some((c) => c.name === name)) {
      return '摄像头名称已存在'
    }

    return null
  }

  const validateIP = (ip: string): string | null => {
    if (!ip) {
      return 'IP 地址不能为空'
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) {
      return 'IP 地址格式无效'
    }

    return null
  }

  const handleAddCamera = () => {
    const nameError = validateCameraName(newCamera.name || '')
    const ipError = validateIP(newCamera.ip || '')

    if (nameError || ipError) {
      setErrors({
        name: nameError || '',
        ip: ipError || '',
      })
      return
    }

    const camera: Camera = {
      id: Date.now().toString(),
      name: newCamera.name!,
      ip: newCamera.ip!,
      username: newCamera.username || 'admin',
      password: newCamera.password!,
      brand: newCamera.brand || 'generic',
    }

    onUpdate([...cameras, camera])
    setNewCamera({
      name: '',
      ip: '',
      username: 'admin',
      password: '',
      brand: 'generic',
    })
    setErrors({})
    setShowAddForm(false)
  }

  const handleRemoveCamera = (id: string) => {
    onUpdate(cameras.filter((c) => c.id !== id))
  }

  const handleNext = () => {
    if (cameras.length === 0) {
      alert('请至少添加一个摄像头')
      return
    }
    onNext()
  }

  return (
    <div className="step-content">
      <h2>摄像头配置</h2>
      <p className="step-subtitle">添加并配置需要监控的摄像头</p>

      <div className="camera-list">
        {cameras.map((camera) => (
          <div key={camera.id} className="camera-item">
            <div className="camera-info">
              <div className="camera-name">{camera.name}</div>
              <div className="camera-details">
                {camera.ip} • {brandTemplates.find((b) => b.value === camera.brand)?.label}
              </div>
            </div>
            <button
              className="btn-remove"
              onClick={() => handleRemoveCamera(camera.id)}
            >
              删除
            </button>
          </div>
        ))}
      </div>

      {!showAddForm ? (
        <button
          className="btn btn-secondary"
          onClick={() => setShowAddForm(true)}
          style={{ marginBottom: '2rem' }}
        >
          + 添加摄像头
        </button>
      ) : (
        <div className="add-camera-form">
          <h3>添加摄像头</h3>

          <div className="form-group">
            <label htmlFor="cameraName">
              摄像头名称 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="cameraName"
              value={newCamera.name}
              onChange={(e) =>
                setNewCamera({ ...newCamera, name: e.target.value.toLowerCase() })
              }
              placeholder="例如: cam-front"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="cameraIP">
              IP 地址 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="cameraIP"
              value={newCamera.ip}
              onChange={(e) => setNewCamera({ ...newCamera, ip: e.target.value })}
              placeholder="例如: 192.168.1.100"
              className={errors.ip ? 'error' : ''}
            />
            {errors.ip && <div className="error-message">{errors.ip}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="cameraBrand">
              摄像头品牌 <span className="required">*</span>
            </label>
            <select
              id="cameraBrand"
              value={newCamera.brand}
              onChange={(e) => setNewCamera({ ...newCamera, brand: e.target.value })}
            >
              {brandTemplates.map((brand) => (
                <option key={brand.value} value={brand.value}>
                  {brand.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cameraUsername">用户名</label>
              <input
                type="text"
                id="cameraUsername"
                value={newCamera.username}
                onChange={(e) =>
                  setNewCamera({ ...newCamera, username: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="cameraPassword">
                密码 <span className="required">*</span>
              </label>
              <input
                type="password"
                id="cameraPassword"
                value={newCamera.password}
                onChange={(e) =>
                  setNewCamera({ ...newCamera, password: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                setErrors({})
              }}
            >
              取消
            </button>
            <button className="btn btn-primary" onClick={handleAddCamera}>
              确认添加
            </button>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button className="btn btn-secondary" onClick={onPrevious}>
          上一步
        </button>
        <button className="btn btn-primary" onClick={handleNext}>
          下一步
        </button>
      </div>
    </div>
  )
}

export default CameraConfigStep
