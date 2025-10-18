/**
 * WizardPage 组件单元测试
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import WizardPage from '../../src/pages/WizardPage'

describe('WizardPage', () => {
  it('应该渲染三个步骤', () => {
    render(
      <BrowserRouter>
        <WizardPage />
      </BrowserRouter>
    )

    expect(screen.getByText('硬件配置')).toBeInTheDocument()
    expect(screen.getByText('摄像头配置')).toBeInTheDocument()
    expect(screen.getByText('复核部署')).toBeInTheDocument()
  })

  it('默认应该显示第一步', () => {
    render(
      <BrowserRouter>
        <WizardPage />
      </BrowserRouter>
    )

    expect(screen.getByText('实例名称')).toBeInTheDocument()
    expect(screen.getByText('硬件加速模式')).toBeInTheDocument()
  })

  it('第一步应该包含必填字段标识', () => {
    render(
      <BrowserRouter>
        <WizardPage />
      </BrowserRouter>
    )

    const requiredMarkers = screen.getAllByText('*')
    expect(requiredMarkers.length).toBeGreaterThan(0)
  })
})
