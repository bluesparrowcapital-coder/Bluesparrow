import { Check } from 'lucide-react'
import { clsx } from 'clsx'

interface Step {
  label: string
  done: boolean
  active?: boolean
}

interface StepProgressProps {
  steps: Step[]
}

export function StepProgress({ steps }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, i) => (
        <div key={i} className="flex-1 flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition',
                step.done
                  ? 'bg-green-500 border-green-500 text-white'
                  : step.active
                  ? 'bg-sparrow-blue border-sparrow-blue text-white'
                  : 'bg-white border-slate-300 text-slate-400',
              )}
            >
              {step.done ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={clsx(
                'text-xs mt-1 font-medium text-center',
                step.active ? 'text-sparrow-blue' : step.done ? 'text-green-600' : 'text-slate-400',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={clsx(
                'flex-1 h-0.5 mb-5 mx-1',
                step.done ? 'bg-green-500' : 'bg-slate-200',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
