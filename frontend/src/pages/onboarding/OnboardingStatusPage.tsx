import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ChevronRight, Loader2, BadgeCheck, AlertCircle, Clock } from 'lucide-react'
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

interface NseStatus {
  status:      'PENDING' | 'SUBMITTED' | 'REGISTERED' | 'FAILED'
  clientCode:  string | null
  onboardedAt: string | null
}

const STEPS = [
  { key: 'registration',   label: 'Account Created', path: null },
  { key: 'profileCreated', label: 'Personal Profile', path: '/onboarding/profile' },
  { key: 'addressAdded',   label: 'Address Details',  path: '/onboarding/address' },
  { key: 'nomineeAdded',   label: 'Nominees',          path: '/onboarding/nominees' },
  { key: 'bankAdded',      label: 'Bank Account',      path: '/onboarding/bank' },
  { key: 'kycVerified',    label: 'KYC Verification',  path: '/onboarding/kyc' },
  { key: 'nseOnboarded',   label: 'NSE MF Registration', path: null },
] as const

export default function OnboardingStatusPage() {
  const navigate = useNavigate()
  const [status,    setStatus]    = useState<OnboardingStatus | null>(null)
  const [nseStatus, setNseStatus] = useState<NseStatus | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      onboardingService.getStatus(),
      onboardingService.getNseStatus().catch(() => null),
    ])
      .then(([s, n]) => { setStatus(s); if (n) setNseStatus(n) })
      .catch(() => toast.error('Could not load status'))
      .finally(() => setLoading(false))
  }, [])

  async function handleManualNseSubmit() {
    setSubmitting(true)
    try {
      const result = await onboardingService.submitToNse()
      toast.success(result.message ?? 'Submitted to NSE MF!')
      const n = await onboardingService.getNseStatus()
      setNseStatus(n)
      const s = await onboardingService.getStatus()
      setStatus(s)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'NSE submission failed')
    } finally {
      setSubmitting(false)
    }
  }

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
            {allDone ? "🎉 You're all set to invest!" : 'Complete these steps to start investing'}
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
            const done   = status?.[step.key as keyof OnboardingStatus] as boolean
            const isNext = !done && status?.nextStep?.toLowerCase().includes(step.key.toLowerCase())
            const isNse  = step.key === 'nseOnboarded'

            return (
              <div key={step.key}>
                <button
                  onClick={() => step.path && !done && navigate(step.path)}
                  disabled={!step.path || done}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition text-left',
                    done
                      ? 'bg-green-50 cursor-default'
                      : step.path
                      ? 'hover:bg-blue-50 active:bg-blue-100'
                      : 'cursor-default',
                    isNext && 'ring-2 ring-sparrow-blue/30 bg-blue-50',
                  )}
                >
                  {done
                    ? <CheckCircle2 size={22} className="text-green-500 shrink-0" />
                    : isNse && nseStatus?.status === 'SUBMITTED'
                    ? <Clock size={22} className="text-amber-500 shrink-0 animate-pulse" />
                    : isNse && nseStatus?.status === 'FAILED'
                    ? <AlertCircle size={22} className="text-red-400 shrink-0" />
                    : <Circle size={22} className={clsx('shrink-0', isNext ? 'text-sparrow-blue' : 'text-slate-300')} />
                  }
                  <span className={clsx('flex-1 font-medium text-sm', done ? 'text-green-700' : isNext ? 'text-sparrow-blue' : 'text-slate-600')}>
                    {step.label}
                  </span>
                  {!done && step.path && <ChevronRight size={16} className="text-slate-400" />}
                  {isNext && !isNse && (
                    <span className="text-xs bg-sparrow-blue text-white px-2 py-0.5 rounded-full">Next</span>
                  )}
                  {isNse && nseStatus?.status === 'SUBMITTED' && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Activating…</span>
                  )}
                  {isNse && nseStatus?.status === 'FAILED' && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Failed</span>
                  )}
                </button>

                {/* NSE client code badge */}
                {isNse && done && nseStatus?.clientCode && (
                  <div className="mx-3 mb-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <BadgeCheck size={16} className="text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-green-700 font-semibold">NSE Client Code</p>
                      <p className="text-sm font-mono font-bold text-green-800 tracking-widest">{nseStatus.clientCode}</p>
                    </div>
                  </div>
                )}

                {/* Manual retry for FAILED or pending NSE step */}
                {isNse && !done && status?.kycVerified && status?.bankAdded && status?.profileCreated && nseStatus?.status !== 'SUBMITTED' && (
                  <div className="mx-3 mb-1">
                    <button
                      onClick={handleManualNseSubmit}
                      disabled={submitting}
                      className="w-full text-xs bg-sparrow-blue text-white py-2 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submitting
                        ? <><Loader2 size={13} className="animate-spin" /> Registering…</>
                        : nseStatus?.status === 'FAILED'
                        ? '↩ Retry NSE Registration'
                        : '⚡ Register on NSE MF Now'
                      }
                    </button>
                  </div>
                )}
              </div>
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
