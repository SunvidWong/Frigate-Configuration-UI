import './WizardSteps.css'

interface Step {
  number: number
  title: string
  description: string
}

interface WizardStepsProps {
  steps: Step[]
  currentStep: number
  onStepClick: (stepNumber: number) => void
}

/**
 * 向导步骤指示器组件
 *
 * 显示三个步骤的进度和状态
 */
function WizardSteps({ steps, currentStep, onStepClick }: WizardStepsProps) {
  return (
    <div className="wizard-steps">
      {steps.map((step, index) => (
        <div key={step.number} className="step-container">
          <div
            className={`step ${currentStep === step.number ? 'active' : ''} ${
              currentStep > step.number ? 'completed' : ''
            }`}
            onClick={() => onStepClick(step.number)}
          >
            <div className="step-number">
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`step-connector ${
                currentStep > step.number ? 'completed' : ''
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default WizardSteps
