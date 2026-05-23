import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Loader2, Fingerprint } from 'lucide-react'
import { PinInput } from '../../components/ui/PinInput'
import { authService } from '../../services/authService'
import { useBiometric } from '../../hooks/useBiometric'
import { setTokens, updateOnboardingStep } from '../../store/slices/authSlice'
import type { RootState } from '../../store'

export default function SetPinPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s: RootState) => s.auth.user)
  const { registerBiometric, loading: bioLoading } = useBiometric()

  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep]       = useState<'pin' | 'confirm' | 'biometric'>('pin')
  const [saving, setSaving]   = useState(false)

  // If no user in state (e.g. stale session), redirect to register
  if (!user?.userId) {
    navigate('/auth/register', { replace: true })
    return null
  }

  async function handlePinNext() {
    if (pin.length < 4) return toast.error('Enter 4-digit PIN')
    setStep('confirm')
  }

  async function handleConfirm() {
    if (confirm !== pin) return toast.error('PINs do not match')
    setSaving(true)
    try {
      const res = await authService.setPin({ userId: user!.userId, pin, confirmPin: confirm })
      // setPin returns tokens
      if (res?.accessToken) {
        dispatch(setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken }))
      }
      dispatch(updateOnboardingStep('REGISTERED'))
      setStep('biometric')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not set PIN')
    } finally {
      setSaving(false)
    }
  }

  async function handleBiometric() {
    await registerBiometric()
    navigate('/onboarding/status')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sparrow-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          {step === 'pin' && (
            <>
              <h2 className="text-xl font-bold text-slate-800">Set Your PIN</h2>
              <p className="text-slate-500 text-sm mt-1">Choose a 4-digit security PIN</p>
            </>
          )}
          {step === 'confirm' && (
            <>
              <h2 className="text-xl font-bold text-slate-800">Confirm PIN</h2>
              <p className="text-slate-500 text-sm mt-1">Re-enter your PIN to confirm</p>
            </>
          )}
          {step === 'biometric' && (
            <>
              <h2 className="text-xl font-bold text-slate-800">Add Fingerprint</h2>
              <p className="text-slate-500 text-sm mt-1">Login faster using your fingerprint</p>
            </>
          )}
        </div>

        <div className="card">
          {step === 'pin' && (
            <div className="space-y-6">
              <PinInput value={pin} onChange={setPin} />
              <button className="btn-primary" onClick={handlePinNext} disabled={pin.length < 4}>
                Continue
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <PinInput value={confirm} onChange={setConfirm} />
              <button className="btn-primary" onClick={handleConfirm} disabled={saving || confirm.length < 4}>
                {saving
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving...</span>
                  : 'Set PIN'
                }
              </button>
              <button className="w-full text-slate-500 text-sm" onClick={() => { setConfirm(''); setStep('pin') }}>
                ← Change PIN
              </button>
            </div>
          )}

          {step === 'biometric' && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <Fingerprint size={40} className="text-sparrow-blue" />
              </div>
              <p className="text-slate-600 text-sm">Use your device fingerprint sensor to login without typing PIN every time.</p>
              <button className="btn-primary" onClick={handleBiometric} disabled={bioLoading}>
                {bioLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Registering...</span> : 'Register Fingerprint'}
              </button>
              <button className="w-full text-slate-500 text-sm py-2" onClick={() => navigate('/onboarding/status')}>
                Skip for now
              </button>
            </div>
          )}
        </div>

        {user?.phone && (
          <p className="text-center text-slate-400 text-xs mt-4">Account: +91 {user.phone}</p>
        )}
      </div>
    </div>
  )
}
