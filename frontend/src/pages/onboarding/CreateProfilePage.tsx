import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import { onboardingService } from '../../services/onboardingService'
import { useDraft } from '../../hooks/useDraft'
import DateInput from '../../components/ui/DateInput'

const schema = z.object({
  panNumber:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  fullNameAsPan:      z.string().min(2, 'Name required'),
  dob:                z.string().refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000)
    return age >= 18
  }, 'Must be 18 years or older'),
  gender:             z.enum(['M', 'F', 'T'], { errorMap: () => ({ message: 'Select gender' }) }),
  fatherOrSpouseName: z.string().min(2, 'Required'),
  occupation:         z.enum(['SERVICE', 'PROFESSIONAL', 'BUSINESS', 'AGRICULTURIST', 'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER']),
  taxStatus:          z.enum(['INDIVIDUAL', 'HUF', 'NRI', 'PIO']),
  isPep:              z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function CreateProfilePage() {
  const navigate = useNavigate()
  const [prefilling, setPrefilling] = useState(false)
  const draft = useDraft<FormData>('onboarding_profile')

  const {
    register, handleSubmit, reset, setValue, getValues, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { gender: 'M', occupation: 'SERVICE', taxStatus: 'INDIVIDUAL', isPep: false },
  })

  // ── Load: server profile → localStorage draft → prefill ──
  useEffect(() => {
    onboardingService.getProfile()
      .then((p) => {
        if (p) { reset(p); return }
        throw new Error('no profile')
      })
      .catch(() => {
        // No server profile — try localStorage draft first
        const saved = draft.load()
        if (saved) {
          reset(saved)
          toast('Draft restored', { icon: '📝' })
        }
        // Then silently prefill PAN + name from registration
        onboardingService.getPrefill()
          .then((u) => {
            if (!getValues('panNumber') && u.panNumber)
              setValue('panNumber', u.panNumber)
            if (!getValues('fullNameAsPan') && u.fullName)
              setValue('fullNameAsPan', u.fullName.toUpperCase())
          })
          .catch(() => {})
      })
  }, []) // eslint-disable-line

  // ── Auto-save draft on every field change ──
  const watchedValues = watch()
  useEffect(() => {
    const any = Object.values(watchedValues).some((v) => v !== '' && v !== false && v !== undefined)
    if (any) draft.save(watchedValues)
  }, [watchedValues]) // eslint-disable-line

  async function handlePanPrefill() {
    setPrefilling(true)
    try {
      const u = await onboardingService.getPrefill()
      if (u.panNumber) setValue('panNumber', u.panNumber)
      if (u.fullName)  setValue('fullNameAsPan', u.fullName.toUpperCase())
      toast.success('Details filled from your registration data!')
    } catch {
      toast.error('Could not fetch details')
    } finally {
      setPrefilling(false)
    }
  }

  async function onSubmit(data: FormData) {
    try {
      await onboardingService.saveProfile(data as unknown as Record<string, unknown>)
      draft.clear()   // ← remove draft after successful save
      toast.success('Profile saved!')
      navigate('/onboarding/address')
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not save profile')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto pt-4">
        <button onClick={() => navigate('/onboarding/status')} className="flex items-center gap-1 text-slate-500 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-800 mb-1">Personal Profile</h1>
        <p className="text-slate-500 text-sm mb-6">Required for NSE MF onboarding</p>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          {/* Auto-fill banner */}
          <button
            type="button"
            onClick={handlePanPrefill}
            disabled={prefilling}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-sparrow-blue rounded-xl text-sm font-medium hover:bg-blue-100 transition"
          >
            {prefilling
              ? <><Loader2 size={15} className="animate-spin" /> Fetching...</>
              : <><Sparkles size={15} /> Auto-fill from registration data</>
            }
          </button>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
            <input {...register('panNumber')} placeholder="ABCDE1234F" className="input-field uppercase" style={{ textTransform: 'uppercase' }} />
            {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name (as on PAN)</label>
            <input {...register('fullNameAsPan')} placeholder="RAHUL KUMAR SHARMA" className="input-field" />
            {errors.fullNameAsPan && <p className="text-red-500 text-xs mt-1">{errors.fullNameAsPan.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <DateInput
                value={watch('dob') ?? ''}
                onChange={(iso) => setValue('dob', iso, { shouldValidate: true })}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select {...register('gender')} className="input-field">
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="T">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Father / Spouse Name</label>
            <input {...register('fatherOrSpouseName')} placeholder="Father or spouse full name" className="input-field" />
            {errors.fatherOrSpouseName && <p className="text-red-500 text-xs mt-1">{errors.fatherOrSpouseName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
              <select {...register('occupation')} className="input-field">
                <option value="SERVICE">Salaried / Service</option>
                <option value="PROFESSIONAL">Self Employed / Professional</option>
                <option value="BUSINESS">Business</option>
                <option value="AGRICULTURIST">Agriculturist</option>
                <option value="RETIRED">Retired</option>
                <option value="HOUSEWIFE">Housewife</option>
                <option value="STUDENT">Student</option>
                <option value="OTHER">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Status</label>
              <select {...register('taxStatus')} className="input-field">
                <option value="INDIVIDUAL">Individual</option>
                <option value="HUF">HUF</option>
                <option value="NRI">NRI</option>
                <option value="PIO">PIO</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <input {...register('isPep')} type="checkbox" id="isPep" className="w-4 h-4 accent-sparrow-blue" />
            <label htmlFor="isPep" className="text-sm text-slate-700">
              I am a Politically Exposed Person (PEP)
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving...</span>
              : 'Save & Continue →'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
