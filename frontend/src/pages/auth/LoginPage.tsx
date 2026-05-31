import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Loader2, Fingerprint, Lock } from 'lucide-react'
import { authService } from '../../services/authService'
import { useBiometric } from '../../hooks/useBiometric'
import { setTokens, setUser, logout } from '../../store/slices/authSlice'

export default function LoginPage() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { loginWithBiometric, loading: bioLoading } = useBiometric()

  const [phone,   setPhone]   = useState('')
  const [pin,     setPin]     = useState('')
  const [step,    setStep]    = useState<'phone' | 'pin'>('phone')
  const [loading, setLoading] = useState(false)
  const [locked,  setLocked]  = useState(false)

  function handlePhoneNext() {
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error('Enter valid 10-digit mobile number')
    setStep('pin')
  }

  async function handlePinLogin() {
    if (pin.length < 4) return
    setLoading(true)
    try {
      const res = await authService.loginWithPin({ phone, pin })
      const d = res.data // { user, accessToken, refreshToken }
      if (d.user.role === 'DISTRIBUTOR') {
        toast.error('This login is for investors. Please use Distributor Login.')
        navigate('/distributor/login')
        return
      }
      dispatch(setTokens({ accessToken: d.accessToken, refreshToken: d.refreshToken }))
      dispatch(setUser({
        userId:   d.user.id,
        phone:    d.user.phone,
        email:    d.user.email,
        fullName: d.user.fullName,
        role:     d.user.role,
      }))
      toast.success('Welcome back!')
      navigate('/onboarding/status')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string; lockedUntil?: string } } })?.response?.status
      const data   = (err as { response?: { data?: { message?: string; lockedUntil?: string } } })?.response?.data
      if (status === 423) {
        setLocked(true)
        toast.error(`Account locked. Try after 30 minutes.`)
      } else {
        toast.error(data?.message ?? 'Incorrect PIN')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFingerprint() {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return toast.error('Enter your mobile number first')
    }
    const tokens = await loginWithBiometric(phone)
    if (tokens) {
      const d = tokens as { user?: { id?: string; phone?: string; email?: string; fullName?: string; role?: string }; accessToken: string; refreshToken: string }
      if (d.user?.role === 'DISTRIBUTOR') {
        dispatch(logout())
        toast.error('This login is for investors. Please use Distributor Login.')
        navigate('/distributor/login')
        return
      }
      dispatch(setTokens({ accessToken: d.accessToken, refreshToken: d.refreshToken }))
      if (d.user) dispatch(setUser({ userId: d.user.id ?? '', phone: d.user.phone ?? phone, email: d.user.email, fullName: d.user.fullName, role: d.user.role }))
      toast.success('Welcome back!')
      navigate('/onboarding/status')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sparrow-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-1">Sign in to Blue Sparrow</p>
        </div>

        <div className="card">
          {/* Phone input — always visible */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <div className="flex">
              <span className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600 font-medium">+91</span>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setStep('phone'); setPin('') }}
                placeholder="9876543210"
                maxLength={10}
                className="input-field rounded-l-none"
              />
            </div>
          </div>

          {step === 'phone' && (
            <div className="space-y-3">
              <button className="btn-primary" onClick={handlePhoneNext}>Continue with PIN</button>
              <button
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:border-sparrow-blue hover:text-sparrow-blue transition"
                onClick={handleFingerprint}
                disabled={bioLoading}
              >
                {bioLoading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Fingerprint size={18} />
                }
                Login with Fingerprint
              </button>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center">Enter your PIN or temporary password</p>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  disabled={locked}
                  placeholder="4-digit PIN or mobile+PAN"
                  className="input-field pl-10"
                />
              </div>
              {locked && (
                <p className="text-red-500 text-xs text-center">
                  Too many wrong attempts. Account locked for 30 minutes.
                </p>
              )}
              <button className="btn-primary" onClick={handlePinLogin} disabled={loading || pin.length < 4 || locked}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Verifying...</span>
                  : 'Login'
                }
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:border-sparrow-blue hover:text-sparrow-blue transition"
                onClick={handleFingerprint}
                disabled={bioLoading}
              >
                <Fingerprint size={18} /> Use Fingerprint instead
              </button>
              <button className="w-full text-slate-400 text-sm" onClick={() => { setStep('phone'); setPin('') }}>
                ← Change number
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          New user?{' '}
          <Link to="/auth/register" className="text-sparrow-blue font-medium">Create account</Link>
        </p>
        <p className="text-center text-slate-400 text-xs mt-2">
          ARN holder?{' '}
          <Link to="/distributor/login" className="text-sparrow-teal font-medium">Login as Distributor</Link>
        </p>
      </div>
    </div>
  )
}
