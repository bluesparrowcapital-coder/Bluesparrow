import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { authService } from '../../services/authService'
import { setUser } from '../../store/slices/authSlice'

const schema = z.object({
  fullName:   z.string().min(2, 'Name must be at least 2 characters'),
  email:      z.string().email('Invalid email address'),
  phone:      z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  panNumber:  z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/i, 'Invalid PAN format (e.g. ABCDE1234F)').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      const res = await authService.register({
        fullName:  data.fullName,
        email:     data.email,
        phone:     data.phone,
        panNumber: data.panNumber ? data.panNumber.toUpperCase() : undefined,
      })
      dispatch(setUser({ userId: res.data.userId, phone: data.phone, fullName: data.fullName }))
      toast.success('Account created! Now set your PIN.')
      navigate('/auth/set-pin')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sparrow-blue rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 mt-1">Start your mutual fund journey</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                {...register('fullName')}
                placeholder="As per PAN card"
                className="input-field"
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="input-field"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <div className="flex">
                <span className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600 font-medium">+91</span>
                <input
                  {...register('phone')}
                  placeholder="9876543210"
                  maxLength={10}
                  className="input-field rounded-l-none"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PAN Number <span className="text-slate-400 font-normal">(optional, add later)</span>
              </label>
              <input
                {...register('panNumber')}
                placeholder="ABCDE1234F"
                className="input-field uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber.message}</p>}
            </div>

            <button type="submit" className="btn-primary mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-sparrow-blue font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
