/**
 * App 组件单元测试
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../../src/App'

describe('App', () => {
  it('应该渲染主标题', () => {
    render(<App />)
    expect(screen.getByText('Frigate 配置与部署')).toBeInTheDocument()
  })

  it('应该渲染副标题', () => {
    render(<App />)
    expect(screen.getByText('快速配置 NVR 监控实例')).toBeInTheDocument()
  })

  it('应该渲染页脚版本信息', () => {
    render(<App />)
    expect(screen.getByText(/Frigate Configuration UI v1.0.0/)).toBeInTheDocument()
  })
})
