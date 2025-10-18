import { useState } from 'react'
import WizardSteps from '../components/WizardSteps'
import HardwareConfigStep from '../components/HardwareConfigStep'
import CameraConfigStep from '../components/CameraConfigStep'
import ReviewDeployStep from '../components/ReviewDeployStep'
import './WizardPage.css'

// 定义 Wizard 数据类型
interface WizardData {
  hardware: {
    instanceName: string
    hwMode: string
    hwDevice: string
  }
  cameras: any[]
}

/**
 * 三步向导页面
 *
 * 根据 FR-008: 三步向导（硬件配置 → 摄像头配置 → 复核部署）
 */
function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>({
    hardware: {
      instanceName: '',
      hwMode: 'cpu',
      hwDevice: '',
    },
    cameras: [],
  })

  const steps = [
    { number: 1, title: '硬件配置', description: '配置实例名称与硬件加速' },
    { number: 2, title: '摄像头配置', description: '添加并配置摄像头' },
    { number: 3, title: '复核部署', description: '检查配置并部署实例' },
  ]

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber)
  }

  const updateHardwareData = (data: any) => {
    setWizardData((prev) => ({
      ...prev,
      hardware: data,
    }))
  }

  const updateCameraData = (cameras: any[]) => {
    setWizardData((prev) => ({
      ...prev,
      cameras,
    }))
  }

  return (
    <div className="wizard-page">
      <WizardSteps
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      <div className="wizard-content">
        {currentStep === 1 && (
          <HardwareConfigStep
            data={wizardData.hardware}
            onUpdate={updateHardwareData}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <CameraConfigStep
            cameras={wizardData.cameras}
            onUpdate={updateCameraData}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )}

        {currentStep === 3 && (
          <ReviewDeployStep
            wizardData={wizardData}
            onPrevious={handlePrevious}
          />
        )}
      </div>
    </div>
  )
}

export default WizardPage
