/**
 * UCCProfilePage – single unified form for NSE UCC (Unified Client Code) onboarding.
 * Combines: Personal Details · Address · Nominees · Bank Account
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Loader2, Sparkles, User, MapPin, Users, CreditCard,
  Plus, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { onboardingService, bankService } from '../../services/onboardingService'
import { useDraft } from '../../hooks/useDraft'
import DateInput from '../../components/ui/DateInput'

// ─── Zod schema – personal fields ─────────────────────────
const personalSchema = z.object({
  panNumber:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN (e.g. ABCDE1234F)'),
  fullNameAsPan:      z.string().min(2, 'Name required'),
  dob:                z.string().refine(
    (d) => (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000) >= 18,
    'Must be 18 or older',
  ),
  gender:             z.enum(['M', 'F', 'T'], { errorMap: () => ({ message: 'Select gender' }) }),
  fatherOrSpouseName: z.string().min(2, 'Required'),
  motherName:         z.string().optional(),
  occupation:         z.enum(['SERVICE', 'PROFESSIONAL', 'BUSINESS', 'AGRICULTURIST', 'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER']),
  taxStatus:          z.enum(['INDIVIDUAL', 'HUF', 'NRI', 'PIO']),
  annualIncome:       z.enum(['BELOW_1L', '1L_TO_5L', '5L_TO_10L', '10L_TO_25L', '25L_TO_50L', '50L_TO_1CR', 'ABOVE_1CR'], {
    errorMap: () => ({ message: 'Select income' }),
  }),
  isPep: z.boolean(),
})
type PersonalData = z.infer<typeof personalSchema>

// ─── Address types ────────────────────────────────────────
interface AddressForm {
  addressLine1: string
  addressLine2: string
  city:         string
  district:     string
  state:        string
  pincode:      string
  country:      string
}
const emptyAddress = (): AddressForm => ({
  addressLine1: '', addressLine2: '', city: '', district: '', state: '', pincode: '', country: 'India',
})

// ─── Nominee types ────────────────────────────────────────
interface NomineeForm {
  fullName:     string
  relationship: string
  dob:          string
  percentage:   number
  guardianName: string
  guardianRel:  string
  docType:      string
  docNumber:    string
}
const emptyNominee = (): NomineeForm => ({
  fullName: '', relationship: '', dob: '', percentage: 100,
  guardianName: '', guardianRel: '', docType: '', docNumber: '',
})

// ─── Constants ────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]
const RELATIONSHIPS = ['SPOUSE','SON','DAUGHTER','FATHER','MOTHER','BROTHER','SISTER','GRANDFATHER','GRANDMOTHER','GRANDSON','GRANDDAUGHTER','OTHER']
const DOC_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar' }, { value: 'PAN', label: 'PAN' },
  { value: 'PASSPORT', label: 'Passport' }, { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
]

function isMinor(dob: string): boolean {
  if (!dob) return false
  return (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25) < 18
}
function toTitleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()) }

// ─── Section header component ─────────────────────────────
function SectionHeader({
  icon, title, subtitle, open, onToggle,
}: { icon: React.ReactNode; title: string; subtitle: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition text-left"
    >
      <span className="w-8 h-8 bg-sparrow-blue rounded-lg flex items-center justify-center text-white shrink-0">
        {icon}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────
export default function UCCProfilePage() {
  const navigate = useNavigate()

  // Section open/close state
  const [openSections, setOpenSections] = useState({ personal: true, address: true, nominee: true, bank: true })
  function toggle(section: keyof typeof openSections) {
    setOpenSections((s) => ({ ...s, [section]: !s[section] }))
  }

  // ── Personal form (RHF + Zod) ──
  const personalDraft = useDraft<PersonalData>('ucc_personal')
  const {
    register, handleSubmit: rhfSubmit, reset: resetPersonal,
    setValue: setPersonalValue, getValues: getPersonalValues,
    watch: watchPersonal, formState: { errors: pErrors },
  } = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      gender: 'M', occupation: 'SERVICE', taxStatus: 'INDIVIDUAL',
      annualIncome: 'BELOW_1L', isPep: false,
    },
  })

  // ── Address state ──
  const [permanent, setPermanent]           = useState<AddressForm>(emptyAddress())
  const [correspondence, setCorrespondence] = useState<AddressForm>(emptyAddress())
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [addrErrors, setAddrErrors]         = useState<Record<string, string>>({})

  // ── Nominee state ──
  const [nominees, setNominees] = useState<NomineeForm[]>([emptyNominee()])
  const [nomErrors, setNomErrors] = useState<Record<string, string>>({})
  const totalPct = nominees.reduce((s, n) => s + Number(n.percentage || 0), 0)

  // ── Bank state ──
  const [existingAccounts, setExistingAccounts] = useState<any[]>([])
  const [showBankForm, setShowBankForm]         = useState(false)
  const [bank, setBank] = useState({ accountNumber: '', ifscCode: '', bankName: '', accountHolder: '', accountType: 'SB' })
  const [bankErrors, setBankErrors] = useState<Partial<typeof bank>>({})

  // ── Loading flags ──
  const [prefilling, setPrefilling] = useState(false)
  const [initialising, setInitialising] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Load all existing data on mount ──
  useEffect(() => {
    Promise.allSettled([
      onboardingService.getProfile(),
      onboardingService.getAddresses(),
      bankService.getAccounts(),
    ]).then(([profileRes, addrRes, bankRes]) => {
      // Personal
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        resetPersonal(profileRes.value)
      } else {
        const saved = personalDraft.load()
        if (saved) resetPersonal(saved)
        // Try prefill from registration
        onboardingService.getPrefill().then((u) => {
          if (!getPersonalValues('panNumber') && u.panNumber)
            setPersonalValue('panNumber', u.panNumber)
          if (!getPersonalValues('fullNameAsPan') && u.fullName)
            setPersonalValue('fullNameAsPan', u.fullName.toUpperCase())
        }).catch(() => {})
      }

      // Addresses
      if (addrRes.status === 'fulfilled') {
        const list: any[] = addrRes.value ?? []
        list.forEach((a: any) => {
          const f: AddressForm = {
            addressLine1: a.addressLine1 ?? '', addressLine2: a.addressLine2 ?? '',
            city: a.city ?? '', district: a.district ?? '',
            state: a.state ?? '', pincode: a.pincode ?? '', country: a.country ?? 'India',
          }
          if (a.type === 'PERMANENT')      setPermanent(f)
          if (a.type === 'CORRESPONDENCE') setCorrespondence(f)
        })
      }

      // Bank
      if (bankRes.status === 'fulfilled') {
        const accs: any[] = bankRes.value ?? []
        setExistingAccounts(accs)
        setShowBankForm(accs.length === 0)
      } else {
        setShowBankForm(true)
      }
    }).finally(() => setInitialising(false))
  }, []) // eslint-disable-line

  // Auto-save personal draft on change
  const watchedPersonal = watchPersonal()
  useEffect(() => {
    const any = Object.values(watchedPersonal).some((v) => v !== '' && v !== false && v !== undefined)
    if (any) personalDraft.save(watchedPersonal)
  }, [watchedPersonal]) // eslint-disable-line

  // ── Auto-fill from registration ──
  async function handlePrefill() {
    setPrefilling(true)
    try {
      const u = await onboardingService.getPrefill()
      if (u.panNumber) setPersonalValue('panNumber', u.panNumber)
      if (u.fullName)  setPersonalValue('fullNameAsPan', u.fullName.toUpperCase())
      toast.success('Pre-filled from registration data!')
    } catch {
      toast.error('Could not fetch details')
    } finally {
      setPrefilling(false)
    }
  }

  // ── Address helpers ──
  function setAddr(which: 'perm' | 'corr', field: keyof AddressForm, value: string) {
    const textFields: (keyof AddressForm)[] = ['addressLine1', 'addressLine2', 'city', 'district']
    const finalVal = textFields.includes(field) ? toTitleCase(value) : value
    if (which === 'perm') setPermanent((p) => ({ ...p, [field]: finalVal }))
    else setCorrespondence((p) => ({ ...p, [field]: finalVal }))
    setAddrErrors((e) => { const n = { ...e }; delete n[`${which}.${field}`]; return n })
  }
  function validateAddress(): boolean {
    const errs: Record<string, string> = {}
    const check = (f: AddressForm, pfx: string) => {
      if (!f.addressLine1.trim()) errs[`${pfx}.addressLine1`] = 'Required'
      if (!f.city.trim())         errs[`${pfx}.city`]         = 'Required'
      if (!f.state)               errs[`${pfx}.state`]        = 'Required'
      if (!/^\d{6}$/.test(f.pincode)) errs[`${pfx}.pincode`] = '6-digit pincode required'
    }
    check(permanent, 'perm')
    if (!sameAsPermanent) check(correspondence, 'corr')
    setAddrErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Nominee helpers ──
  function setNominee(i: number, field: keyof NomineeForm, value: string | number) {
    setNominees((prev) => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n })
  }
  function addNominee() {
    if (nominees.length >= 3) return
    const remaining = 100 - nominees.reduce((s, n) => s + Number(n.percentage || 0), 0)
    setNominees((p) => [...p, { ...emptyNominee(), percentage: Math.max(0, remaining) }])
  }
  function removeNominee(i: number) {
    if (nominees.length === 1) return
    const removed = nominees[i].percentage
    const next = nominees.filter((_, idx) => idx !== i)
    next[0].percentage = Number(next[0].percentage) + Number(removed)
    setNominees(next)
  }
  function validateNominees(): boolean {
    const errs: Record<string, string> = {}
    nominees.forEach((n, i) => {
      if (!n.fullName.trim())  errs[`${i}.fullName`]     = 'Name required'
      if (!n.relationship)     errs[`${i}.relationship`] = 'Relationship required'
      if (!n.percentage || n.percentage < 1) errs[`${i}.percentage`] = 'Min 1%'
      if (isMinor(n.dob) && !n.guardianName.trim())
        errs[`${i}.guardianName`] = 'Guardian required for minor'
    })
    if (totalPct !== 100) errs['total'] = `Total must be 100% (currently ${totalPct}%)`
    setNomErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Bank helpers ──
  function validateBank(): boolean {
    if (!showBankForm) return true
    const errs: Partial<typeof bank> = {}
    if (!/^\d{9,18}$/.test(bank.accountNumber)) errs.accountNumber = '9–18 digits required'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.toUpperCase())) errs.ifscCode = 'Invalid IFSC'
    if (!bank.bankName.trim())      errs.bankName      = 'Bank name required'
    if (!bank.accountHolder.trim()) errs.accountHolder = 'Holder name required'
    setBankErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Final submit ──
  async function onSaveAll(personalData: PersonalData) {
    // Validate other sections
    const addrOk = validateAddress()
    const nomOk  = validateNominees()
    const bankOk = validateBank()

    if (!addrOk) { toggle('address'); toast.error('Fix address errors'); return }
    if (!nomOk)  { toggle('nominee'); toast.error('Fix nominee errors');  return }
    if (!bankOk) { toggle('bank');    toast.error('Fix bank errors');     return }

    setSaving(true)
    try {
      // 1. Personal profile
      await onboardingService.saveProfile(personalData as unknown as Record<string, unknown>)

      // 2. Address
      await onboardingService.saveAddress({ type: 'PERMANENT', ...permanent })
      await onboardingService.saveAddress({
        type: 'CORRESPONDENCE',
        ...(sameAsPermanent ? permanent : correspondence),
      })

      // 3. Nominees
      const nomPayload = nominees.map((n) => ({
        fullName:     n.fullName.trim(),
        relationship: n.relationship,
        dob:          n.dob || undefined,
        percentage:   Number(n.percentage),
        guardianName: n.guardianName.trim() || undefined,
        guardianRel:  n.guardianRel.trim() || undefined,
        docType:      n.docType || undefined,
        docNumber:    n.docNumber.trim() || undefined,
      }))
      await onboardingService.saveNominees(nomPayload)

      // 4. Bank (only if no existing accounts and form is filled)
      if (showBankForm && bank.accountNumber) {
        await bankService.addAccount({
          ...bank,
          ifscCode:  bank.ifscCode.toUpperCase(),
          isDefault: true,
        })
      }

      personalDraft.clear()
      toast.success('UCC Profile saved successfully!')
      navigate('/onboarding/status')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (initialising) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-sparrow-blue" />
      </div>
    )
  }

  return (
    <form onSubmit={rhfSubmit(onSaveAll)} className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* Page title */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">UCC Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Unified Client Code – required for NSE MF onboarding</p>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 1 – PERSONAL DETAILS
      ════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<User size={16} />}
        title="Personal Details"
        subtitle="PAN, name, date of birth, occupation"
        open={openSections.personal}
        onToggle={() => toggle('personal')}
      />

      {openSections.personal && (
        <div className="card space-y-4">
          {/* Auto-fill */}
          <button
            type="button"
            onClick={handlePrefill}
            disabled={prefilling}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-sparrow-blue rounded-xl text-sm font-medium hover:bg-blue-100 transition"
          >
            {prefilling
              ? <><Loader2 size={14} className="animate-spin" /> Fetching…</>
              : <><Sparkles size={14} /> Auto-fill from registration</>}
          </button>

          {/* PAN + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">PAN Number <span className="text-red-500">*</span></label>
              <input
                {...register('panNumber')}
                placeholder="ABCDE1234F"
                className="input-field uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              {pErrors.panNumber && <p className="err">{pErrors.panNumber.message}</p>}
            </div>
            <div>
              <label className="field-label">Full Name (as on PAN) <span className="text-red-500">*</span></label>
              <input {...register('fullNameAsPan')} placeholder="RAHUL KUMAR" className="input-field" />
              {pErrors.fullNameAsPan && <p className="err">{pErrors.fullNameAsPan.message}</p>}
            </div>
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date of Birth <span className="text-red-500">*</span></label>
              <DateInput
                value={watchPersonal('dob') ?? ''}
                onChange={(iso) => setPersonalValue('dob', iso, { shouldValidate: true })}
                max={new Date().toISOString().split('T')[0]}
              />
              {pErrors.dob && <p className="err">{pErrors.dob.message}</p>}
            </div>
            <div>
              <label className="field-label">Gender <span className="text-red-500">*</span></label>
              <select {...register('gender')} className="input-field">
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="T">Other / Transgender</option>
              </select>
            </div>
          </div>

          {/* Father / Mother */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Father / Spouse Name <span className="text-red-500">*</span></label>
              <input {...register('fatherOrSpouseName')} placeholder="Full name" className="input-field" />
              {pErrors.fatherOrSpouseName && <p className="err">{pErrors.fatherOrSpouseName.message}</p>}
            </div>
            <div>
              <label className="field-label">Mother's Name</label>
              <input {...register('motherName')} placeholder="Optional" className="input-field" />
            </div>
          </div>

          {/* Occupation + Tax Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Occupation <span className="text-red-500">*</span></label>
              <select {...register('occupation')} className="input-field">
                <option value="SERVICE">Salaried / Service</option>
                <option value="PROFESSIONAL">Self-Employed / Professional</option>
                <option value="BUSINESS">Business</option>
                <option value="AGRICULTURIST">Agriculturist</option>
                <option value="RETIRED">Retired</option>
                <option value="HOUSEWIFE">Housewife</option>
                <option value="STUDENT">Student</option>
                <option value="OTHER">Others</option>
              </select>
            </div>
            <div>
              <label className="field-label">Tax Status <span className="text-red-500">*</span></label>
              <select {...register('taxStatus')} className="input-field">
                <option value="INDIVIDUAL">Individual</option>
                <option value="HUF">HUF</option>
                <option value="NRI">NRI</option>
                <option value="PIO">PIO</option>
              </select>
            </div>
          </div>

          {/* Annual Income */}
          <div>
            <label className="field-label">Annual Income <span className="text-red-500">*</span></label>
            <select {...register('annualIncome')} className="input-field">
              <option value="BELOW_1L">Below ₹1 Lakh</option>
              <option value="1L_TO_5L">₹1 – 5 Lakh</option>
              <option value="5L_TO_10L">₹5 – 10 Lakh</option>
              <option value="10L_TO_25L">₹10 – 25 Lakh</option>
              <option value="25L_TO_50L">₹25 – 50 Lakh</option>
              <option value="50L_TO_1CR">₹50 Lakh – 1 Crore</option>
              <option value="ABOVE_1CR">Above ₹1 Crore</option>
            </select>
            {pErrors.annualIncome && <p className="err">{pErrors.annualIncome.message}</p>}
          </div>

          {/* PEP */}
          <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 cursor-pointer select-none">
            <input {...register('isPep')} type="checkbox" className="w-4 h-4 accent-sparrow-blue" />
            <span className="text-sm text-slate-700">I am a Politically Exposed Person (PEP)</span>
          </label>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 2 – ADDRESS
      ════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<MapPin size={16} />}
        title="Address Details"
        subtitle="Permanent & correspondence address"
        open={openSections.address}
        onToggle={() => toggle('address')}
      />

      {openSections.address && (
        <div className="card space-y-5">
          {/* Permanent address */}
          <p className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">Permanent Address</p>
          <AddressBlock prefix="perm" form={permanent} errors={addrErrors} onChange={(f, v) => setAddr('perm', f, v)} />

          {/* Correspondence toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => setSameAsPermanent(e.target.checked)}
              className="w-4 h-4 accent-sparrow-blue"
            />
            <span className="text-sm text-slate-700 font-medium">
              Correspondence address same as permanent address
            </span>
          </label>

          {/* Correspondence address */}
          {!sameAsPermanent && (
            <>
              <p className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1">Correspondence Address</p>
              <AddressBlock prefix="corr" form={correspondence} errors={addrErrors} onChange={(f, v) => setAddr('corr', f, v)} />
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 3 – NOMINEES
      ════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<Users size={16} />}
        title="Nominee Details"
        subtitle="Add up to 3 nominees · total must be 100%"
        open={openSections.nominee}
        onToggle={() => toggle('nominee')}
      />

      {openSections.nominee && (
        <div className="space-y-3">
          {/* Total percentage bar */}
          <div className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm font-medium ${totalPct === 100 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            <span>Total allocation</span>
            <span className="font-bold tabular-nums">{totalPct}%</span>
          </div>
          {nomErrors['total'] && <p className="err px-1">{nomErrors['total']}</p>}

          {nominees.map((nom, i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Nominee {i + 1}</p>
                {nominees.length > 1 && (
                  <button type="button" onClick={() => removeNominee(i)} className="text-red-400 hover:text-red-600 transition p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="field-label">Full Name <span className="text-red-500">*</span></label>
                  <input value={nom.fullName} onChange={(e) => setNominee(i, 'fullName', e.target.value)} placeholder="Nominee full name" className="input-field" />
                  {nomErrors[`${i}.fullName`] && <p className="err">{nomErrors[`${i}.fullName`]}</p>}
                </div>
                <div>
                  <label className="field-label">Relationship <span className="text-red-500">*</span></label>
                  <select value={nom.relationship} onChange={(e) => setNominee(i, 'relationship', e.target.value)} className="input-field">
                    <option value="">Select</option>
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {nomErrors[`${i}.relationship`] && <p className="err">{nomErrors[`${i}.relationship`]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Date of Birth</label>
                  <DateInput
                    value={nom.dob}
                    onChange={(iso) => setNominee(i, 'dob', iso)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="field-label">Share % <span className="text-red-500">*</span></label>
                  <input
                    type="number" min={1} max={100}
                    value={nom.percentage}
                    onChange={(e) => setNominee(i, 'percentage', Number(e.target.value))}
                    className="input-field"
                  />
                  {nomErrors[`${i}.percentage`] && <p className="err">{nomErrors[`${i}.percentage`]}</p>}
                </div>
              </div>

              {/* ID proof */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">ID Proof Type</label>
                  <select value={nom.docType} onChange={(e) => setNominee(i, 'docType', e.target.value)} className="input-field">
                    <option value="">Select (optional)</option>
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">ID Number</label>
                  <input value={nom.docNumber} onChange={(e) => setNominee(i, 'docNumber', e.target.value)} placeholder="Optional" className="input-field" />
                </div>
              </div>

              {/* Guardian (minor nominee) */}
              {isMinor(nom.dob) && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                  <p className="text-xs text-amber-700 font-medium">⚠️ Minor nominee – guardian details required</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Guardian Name <span className="text-red-500">*</span></label>
                      <input value={nom.guardianName} onChange={(e) => setNominee(i, 'guardianName', e.target.value)} placeholder="Guardian full name" className="input-field" />
                      {nomErrors[`${i}.guardianName`] && <p className="err">{nomErrors[`${i}.guardianName`]}</p>}
                    </div>
                    <div>
                      <label className="field-label">Guardian Relation</label>
                      <input value={nom.guardianRel} onChange={(e) => setNominee(i, 'guardianRel', e.target.value)} placeholder="e.g. Father" className="input-field" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {nominees.length < 3 && (
            <button type="button" onClick={addNominee} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-sparrow-blue hover:text-sparrow-blue transition">
              <Plus size={16} /> Add Another Nominee
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          SECTION 4 – BANK ACCOUNT
      ════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<CreditCard size={16} />}
        title="Bank Account"
        subtitle="Primary bank account for redemptions"
        open={openSections.bank}
        onToggle={() => toggle('bank')}
      />

      {openSections.bank && (
        <div className="card space-y-4">
          {/* Existing accounts */}
          {existingAccounts.length > 0 && (
            <div className="space-y-2">
              {existingAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CreditCard size={18} className="text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800 truncate">{acc.bankName}</p>
                    <p className="text-xs text-green-600 font-mono">{'XXXX' + String(acc.accountNumber).slice(-4)} · {acc.accountHolder}</p>
                  </div>
                  {acc.isDefault && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">Primary</span>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowBankForm((v) => !v)}
                className="text-sm text-sparrow-blue hover:underline"
              >
                {showBankForm ? '− Hide form' : '+ Add another account'}
              </button>
            </div>
          )}

          {/* Add bank form */}
          {showBankForm && (
            <div className="space-y-3">
              {existingAccounts.length > 0 && (
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">New Bank Account</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="field-label">Account Number <span className="text-red-500">*</span></label>
                  <input
                    value={bank.accountNumber}
                    onChange={(e) => { setBank((b) => ({ ...b, accountNumber: e.target.value })); setBankErrors((er) => ({ ...er, accountNumber: '' })) }}
                    placeholder="9–18 digit account number"
                    className="input-field"
                  />
                  {bankErrors.accountNumber && <p className="err">{bankErrors.accountNumber}</p>}
                </div>
                <div>
                  <label className="field-label">IFSC Code <span className="text-red-500">*</span></label>
                  <input
                    value={bank.ifscCode}
                    onChange={(e) => { setBank((b) => ({ ...b, ifscCode: e.target.value.toUpperCase() })); setBankErrors((er) => ({ ...er, ifscCode: '' })) }}
                    placeholder="SBIN0001234"
                    className="input-field uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {bankErrors.ifscCode && <p className="err">{bankErrors.ifscCode}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Bank Name <span className="text-red-500">*</span></label>
                  <input
                    value={bank.bankName}
                    onChange={(e) => { setBank((b) => ({ ...b, bankName: e.target.value })); setBankErrors((er) => ({ ...er, bankName: '' })) }}
                    placeholder="State Bank of India"
                    className="input-field"
                  />
                  {bankErrors.bankName && <p className="err">{bankErrors.bankName}</p>}
                </div>
                <div>
                  <label className="field-label">Account Type</label>
                  <select value={bank.accountType} onChange={(e) => setBank((b) => ({ ...b, accountType: e.target.value }))} className="input-field">
                    <option value="SB">Savings (SB)</option>
                    <option value="CA">Current (CA)</option>
                    <option value="NRE">NRE</option>
                    <option value="NRO">NRO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Account Holder Name <span className="text-red-500">*</span></label>
                <input
                  value={bank.accountHolder}
                  onChange={(e) => { setBank((b) => ({ ...b, accountHolder: e.target.value })); setBankErrors((er) => ({ ...er, accountHolder: '' })) }}
                  placeholder="Name as on bank account"
                  className="input-field"
                />
                {bankErrors.accountHolder && <p className="err">{bankErrors.accountHolder}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Save button ── */}
      <div className="sticky bottom-4">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3.5 text-base font-semibold shadow-lg"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Saving Profile…</span>
            : 'Save UCC Profile →'}
        </button>
      </div>
    </form>
  )
}

// ─── Reusable address block ───────────────────────────────
function AddressBlock({
  prefix, form, errors,
  onChange,
}: {
  prefix:   string
  form:     AddressForm
  errors:   Record<string, string>
  onChange: (field: keyof AddressForm, value: string) => void
}) {
  const err = (f: string) => errors[`${prefix}.${f}`]
  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Address Line 1 <span className="text-red-500">*</span></label>
        <input className="input-field" placeholder="House No., Street Name" value={form.addressLine1} onChange={(e) => onChange('addressLine1', e.target.value)} maxLength={200} />
        {err('addressLine1') && <p className="err">{err('addressLine1')}</p>}
      </div>
      <div>
        <label className="field-label">Address Line 2</label>
        <input className="input-field" placeholder="Landmark, Area (optional)" value={form.addressLine2} onChange={(e) => onChange('addressLine2', e.target.value)} maxLength={200} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">City <span className="text-red-500">*</span></label>
          <input className="input-field" placeholder="Mumbai" value={form.city} onChange={(e) => onChange('city', e.target.value)} />
          {err('city') && <p className="err">{err('city')}</p>}
        </div>
        <div>
          <label className="field-label">District</label>
          <input className="input-field" placeholder="Optional" value={form.district} onChange={(e) => onChange('district', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">State <span className="text-red-500">*</span></label>
          <select className="input-field" value={form.state} onChange={(e) => onChange('state', e.target.value)}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {err('state') && <p className="err">{err('state')}</p>}
        </div>
        <div>
          <label className="field-label">Pincode <span className="text-red-500">*</span></label>
          <input className="input-field" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={(e) => onChange('pincode', e.target.value.replace(/\D/g, ''))} />
          {err('pincode') && <p className="err">{err('pincode')}</p>}
        </div>
      </div>
    </div>
  )
}
