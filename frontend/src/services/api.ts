/**
 * API 服务层
 *
 * 统一管理所有后端 API 调用
 */

const API_BASE_URL = '/api'

interface DeployInstanceRequest {
  instance_name: string
  hw_mode: string
  hw_device?: string
  cameras: Array<{
    name: string
    ip: string
    username: string
    password: string
    brand: string
  }>
}

interface DeployInstanceResponse {
  instance_id: string
  container_id: string
  status: string
  message: string
}

interface ApiError {
  code: string
  description: string
  suggestion: string
}

/**
 * 部署 Frigate 实例
 */
export async function deployInstance(
  data: DeployInstanceRequest
): Promise<DeployInstanceResponse> {
  const response = await fetch(`${API_BASE_URL}/instances/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.description || '部署失败')
  }

  return response.json()
}

/**
 * 获取实例列表
 */
export async function listInstances(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/instances`)

  if (!response.ok) {
    throw new Error('获取实例列表失败')
  }

  const data = await response.json()
  return data.instances || []
}

/**
 * 启动实例
 */
export async function startInstance(instanceName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/instances/${instanceName}/start`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '启动实例失败')
  }
}

/**
 * 停止实例
 */
export async function stopInstance(instanceName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/instances/${instanceName}/stop`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '停止实例失败')
  }
}

/**
 * 删除实例
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/instances/${instanceName}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.description || '删除实例失败')
  }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error('健康检查失败')
  }

  return response.json()
}

/**
 * 验证实例名称
 */
export async function validateInstanceName(name: string): Promise<{
  valid: boolean
  error?: string
}> {
  const response = await fetch(
    `${API_BASE_URL}/validate/instance-name?name=${encodeURIComponent(name)}`
  )

  if (!response.ok) {
    throw new Error('名称验证失败')
  }

  return response.json()
}

/**
 * 验证摄像头名称
 */
export async function validateCameraName(
  instanceName: string,
  cameraName: string
): Promise<{
  valid: boolean
  error?: string
}> {
  const response = await fetch(
    `${API_BASE_URL}/validate/camera-name?instance=${encodeURIComponent(
      instanceName
    )}&name=${encodeURIComponent(cameraName)}`
  )

  if (!response.ok) {
    throw new Error('名称验证失败')
  }

  return response.json()
}

/**
 * 测试 RTSP 连接
 */
export async function testRTSPConnection(
  ip: string,
  username: string,
  password: string,
  brand: string
): Promise<{
  success: boolean
  message: string
  warning?: string
}> {
  const response = await fetch(`${API_BASE_URL}/camera/test-rtsp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ip, username, password, brand }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.description || 'RTSP 测试失败')
  }

  return response.json()
}
