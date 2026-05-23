import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronRight, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { onboardingService } from '../../services/onboardingService'

interface OnboardingStatus {
  registration:    boolean
  profileCreated:  boolean
  addressAdded:    boolean
  nomineeAdded:    boolean
  bankAdded:       boolean
  kycVerified:     boolean
  nseOnboarded:    boolean
  nextStep:        string
}

const STEPS = [
  { key: 'registration',   label: 'Account Created', path: null },
  { key: 'profileCreated', label: 'Personal Profile', path: '/onboarding/profile' },
  { key: 'addressAdded',   label: 'Address Details',  path: '/onboarding/address' },
  { key: 'nomineeAdded',   label: 'Nominees',          path: '/onboarding/nominees' },
  { key: 'bankAdded',      label: 'Bank Account',      path: '/onboarding/bank' },
  { key: 'kycVerified',    label: 'KYC Status',        path: '/onboarding/kyc' },
  { key: 'nseOnboarded',   label: 'NSE MF Onboarding', path: null },
] as const

export default function OnboardingStatusPage() {
  const navigate = useNavigate()
  const [status,  setStatus]  = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    onboardingService.getStatus()
      .then(setStatus)
      .catch(() => toast.error('Could not load status'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sparrow-blue" />
      </div>
    )
  }

  const allDone = status?.nseOnboarded

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sparrow-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Complete Your Profile</h1>
          <p className="text-slate-500 text-sm mt-1">
            {allDone ? '🎉 You're all set to invest!' : 'Complete these steps to start investing'}
          </p>
        </div>

        {/* Progress bar */}
        {status && (
          <div className="card mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Progress</span>
              <span>
                {Object.values(status).filter((v) => v === true).length} / {STEPS.length} done
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-sparrow-blue h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(Object.values(status).filter((v) => v === true).length / STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Step list */}
        <div className="card space-y-2">
          {STEPS.map((step) => {
            const done = status?.[step.key as keyof OnboardingStatus] as boolean
            const isNext = status?.nextStep?.toLowerCase().includes(step.key.toLowerCase())

            return (
              <button
                key={step.key}
                onClick={() => step.path && !done && navigate(step.path)}
                disabled={!step.path || done}
                className={clsx(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition text-left',
                  done
                    ? 'bg-green-50 cursor-default'
                    : step.path
                    ? 'hover:bg-blue-50 active:bg-blue-100'
                    : 'cursor-default',
                  isNext && !done && 'ring-2 ring-sparrow-blue/30 bg-blue-50',
                )}
              >
                {done
                  ? <CheckCircle2 size={22} className="text-green-500 shrink-0" />
                  : <Circle size={22} className={clsx('shrink-0', isNext ? 'text-sparrow-blue' : 'text-slate-300')} />
                }
                <span className={clsx('flex-1 font-medium text-sm', done ? 'text-green-700' : isNext ? 'text-sparrow-blue' : 'text-slate-600')}>
                  {step.label}
                </span>
                {!done && step.path && <ChevronRight size={16} className="text-slate-400" />}
                {isNext && !done && (
                  <span className="text-xs bg-sparrow-blue text-white px-2 py-0.5 rounded-full">Next</span>
                )}
              </button>
            )
          })}
        </div>

        {allDone && (
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard →
          </button>
        )}
      </div>
    </div>
  )
}
