/**
 * UCCProfilePage – Ascent Plus-style structured view/edit profile.
 * Cards shown in 2-column grid; each card has an Edit button that
 * opens an inline form for that section only.
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Loader2, Pencil, Plus, Trash2,
  CreditCard, MapPin, Users, User, Building2, CheckCircle2,
} from 'lucide-react'
import { onboardingService, bankService } from '../../services/onboardingService'
import DateInput from '../../components/ui/DateInput'

// ─── Domain types ───────────────────────────────────────────

type EditSection = null | 'profile' | 'address' | 'nominee' | 'bank'

interface ProfileData {
  panNumber:          string
  fullNameAsPan:      string
  dob:                string
  gender:             string
  fatherOrSpouseName: string
  motherName?:        string
  placeOfBirth?:      string
  maritalStatus?:     string
  holdingType?:       string
  occupation:         string
  taxStatus:          string
  annualIncome?:      string
  isPep:              boolean
  user?: { email: string; phone: string }
}

interface AddressData {
  type:          'PERMANENT' | 'CORRESPONDENCE'
  addressLine1:  string
  addressLine2?: string
  city:          string
  district?:     string
  state:         string
  pincode:       string
  country:       string
}

interface NomineeData {
  fullName:      string
  relationship:  string
  dob?:          string
  percentage:    number
  guardianName?: string
  guardianRel?:  string
  docType?:      string
  docNumber?:    string
  email?:        string
  phone?:        string
}

interface BankData {
  id?:           string
  accountNumber: string
  ifscCode:      string
  bankName:      string
  accountHolder: string
  accountType:   string
  isDefault?:    boolean
}

// ─── Display helpers ────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5 truncate">
        {value ? value : <span className="text-slate-300 font-normal">—</span>}
      </p>
    </div>
  )
}

function CardHeader({
  icon, title, onEdit, editing,
}: { icon: React.ReactNode; title: string; onEdit: () => void; editing?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-sparrow-blue/10 flex items-center justify-center text-sparrow-blue">
          {icon}
        </span>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
          editing
            ? 'text-slate-500 bg-slate-100 hover:bg-slate-200'
            : 'text-sparrow-blue bg-blue-50 hover:bg-blue-100'
        }`}
      >
        {editing ? '✕ Cancel' : <><Pencil size={12} /> Edit</>}
      </button>
    </div>
  )
}

// ─── Label maps ─────────────────────────────────────────────

const GENDERS:     Record<string, string> = { M: 'Male', F: 'Female', T: 'Transgender' }
const OCCUPATIONS: Record<string, string> = {
  SERVICE: 'Service', PROFESSIONAL: 'Professional', BUSINESS: 'Business',
  AGRICULTURIST: 'Agriculturist', RETIRED: 'Retired',
  HOUSEWIFE: 'Housewife', STUDENT: 'Student', OTHER: 'Other',
}
const INCOMES: Record<string, string> = {
  BELOW_1L: 'Below ₹1L', '1L_TO_5L': '₹1L – 5L', '5L_TO_10L': '₹5L – 10L',
  '10L_TO_25L': '₹10L – 25L', '25L_TO_50L': '₹25L – 50L',
  '50L_TO_1CR': '₹50L – 1Cr', ABOVE_1CR: 'Above ₹1Cr', ABOVE_25L: 'Above ₹25L',
}
const MARITAL: Record<string, string> = {
  SINGLE: 'Single', MARRIED: 'Married', WIDOWED: 'Widowed', DIVORCED: 'Divorced',
}
const HOLDING: Record<string, string> = {
  SINGLE: 'Single', JOINT: 'Joint', ANYONE_OR_SURVIVOR: 'Anyone or Survivor',
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const RELATIONSHIPS = [
  'SPOUSE','SON','DAUGHTER','FATHER','MOTHER','BROTHER','SISTER',
  'GRANDFATHER','GRANDMOTHER','GRANDSON','GRANDDAUGHTER','OTHER',
]

function isMinor(dob?: string): boolean {
  if (!dob) return false
  return (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25) < 18
}

// ─── Profile Zod schema ─────────────────────────────────────

const profileSchema = z.object({
  panNumber:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN'),
  fullNameAsPan:      z.string().min(2, 'Name required'),
  dob:                z.string().refine(
    (d) => (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000) >= 18,
    'Must be 18 or older',
  ),
  gender:             z.enum(['M', 'F', 'T']),
  fatherOrSpouseName: z.string().min(2, 'Required'),
  motherName:         z.string().optional(),
  placeOfBirth:       z.string().optional(),
  maritalStatus:      z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED']).optional(),
  holdingType:        z.enum(['SINGLE', 'JOINT', 'ANYONE_OR_SURVIVOR']).default('SINGLE'),
  occupation:         z.enum(['SERVICE', 'PROFESSIONAL', 'BUSINESS', 'AGRICULTURIST', 'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER']),
  taxStatus:          z.enum(['INDIVIDUAL', 'HUF', 'NRI', 'PIO']),
  annualIncome:       z.enum(['BELOW_1L', '1L_TO_5L', '5L_TO_10L', '10L_TO_25L', '25L_TO_50L', '50L_TO_1CR', 'ABOVE_1CR']).optional(),
  isPep:              z.boolean().default(false),
})
type ProfileForm = z.infer<typeof profileSchema>

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════

export default function UCCProfilePage() {
  const navigate = useNavigate()

  const [profile,      setProfile]      = useState<ProfileData | null>(null)
  const [addresses,    setAddresses]    = useState<AddressData[]>([])
  const [nominees,     setNominees]     = useState<NomineeData[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankData[]>([])
  const [userInfo,     setUserInfo]     = useState<{ email: string; phone: string } | null>(null)

  const [initialising, setInitialising] = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [editing,      setEditing]      = useState<EditSection>(null)

  // ── Profile form ──
  const {
    register: regProf,
    handleSubmit: rhfProf,
    setValue: setProfVal,
    watch: watchProf,
    reset: resetProfile,
    formState: { errors: profErr },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gender: 'M', occupation: 'SERVICE', taxStatus: 'INDIVIDUAL',
      holdingType: 'SINGLE', isPep: false,
    },
  })
  const profDob = watchProf('dob')

  // ── Load all data ──
  useEffect(() => {
    Promise.allSettled([
      onboardingService.getProfile(),
      onboardingService.getAddresses(),
      onboardingService.getNominees(),
      bankService.getAccounts(),
    ]).then(([profileRes, addrRes, nomRes, bankRes]) => {
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value as ProfileData
        setProfile(p)
        setUserInfo({
          email: p.user?.email ?? (p as any).email ?? '',
          phone: p.user?.phone ?? (p as any).mobile ?? '',
        })
      } else {
        setEditing('profile')
        onboardingService.getPrefill().then((u) => {
          resetProfile((prev) => ({
            ...prev,
            panNumber:     u.panNumber ?? '',
            fullNameAsPan: u.fullName ? u.fullName.toUpperCase() : '',
          }))
        }).catch(() => {})
      }
      if (addrRes.status === 'fulfilled') setAddresses(addrRes.value ?? [])
      if (nomRes.status === 'fulfilled')  setNominees((nomRes.value as NomineeData[]) ?? [])
      if (bankRes.status === 'fulfilled') setBankAccounts(bankRes.value ?? [])
    }).finally(() => setInitialising(false))
  }, []) // eslint-disable-line

  // Sync profile form when data loads
  useEffect(() => {
    if (!profile) return
    resetProfile({
      panNumber:          profile.panNumber          ?? '',
      fullNameAsPan:      profile.fullNameAsPan      ?? '',
      dob:                profile.dob ? profile.dob.substring(0, 10) : '',
      gender:             (profile.gender            as ProfileForm['gender'])      ?? 'M',
      fatherOrSpouseName: profile.fatherOrSpouseName ?? '',
      motherName:         profile.motherName,
      placeOfBirth:       profile.placeOfBirth,
      maritalStatus:      (profile.maritalStatus     as ProfileForm['maritalStatus']) ?? undefined,
      holdingType:        (profile.holdingType       as ProfileForm['holdingType'])   ?? 'SINGLE',
      occupation:         (profile.occupation        as ProfileForm['occupation'])    ?? 'SERVICE',
      taxStatus:          (profile.taxStatus         as ProfileForm['taxStatus'])     ?? 'INDIVIDUAL',
      annualIncome:       (profile.annualIncome      as ProfileForm['annualIncome'])  ?? undefined,
      isPep:              profile.isPep ?? false,
    })
  }, [profile]) // eslint-disable-line

  async function onSaveProfile(data: ProfileForm) {
    setSaving(true)
    try {
      await onboardingService.saveProfile(data as unknown as Record<string, unknown>)
      setProfile(data as unknown as ProfileData)
      setEditing(null)
      toast.success('Profile saved!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save profile')
    } finally { setSaving(false) }
  }

  if (initialising) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-sparrow-blue" />
      </div>
    )
  }

  const permAddr = addresses.find((a) => a.type === 'PERMANENT')
  const corrAddr = addresses.find((a) => a.type === 'CORRESPONDENCE')

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-14 px-4">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">UCC – Unified Client Code details for NSE MF</p>
      </div>

      {/* ════════════════════════════════════════════════
          ROW 1 — PAN Details  |  Personal Details
      ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── PAN Details card ── */}
        <div className="card">
          <CardHeader
            icon={<User size={14} />}
            title="PAN Details"
            editing={editing === 'profile'}
            onEdit={() => setEditing(editing === 'profile' ? null : 'profile')}
          />
          {editing === 'profile' ? (
            <form onSubmit={rhfProf(onSaveProfile)} className="space-y-5">

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">PAN &amp; Identity</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">PAN Number *</label>
                    <input {...regProf('panNumber')} placeholder="ABCDE1234F" className="input-field uppercase" />
                    {profErr.panNumber && <p className="err">{profErr.panNumber.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Name as on PAN *</label>
                    <input {...regProf('fullNameAsPan')} placeholder="Full name on PAN" className="input-field uppercase" />
                    {profErr.fullNameAsPan && <p className="err">{profErr.fullNameAsPan.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Date of Birth *</label>
                    <DateInput value={profDob ?? ''} onChange={(v) => setProfVal('dob', v)} />
                    {profErr.dob && <p className="err">{profErr.dob.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Holding Type</label>
                    <select {...regProf('holdingType')} className="input-field">
                      <option value="SINGLE">Single</option>
                      <option value="JOINT">Joint</option>
                      <option value="ANYONE_OR_SURVIVOR">Anyone or Survivor</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Tax Status *</label>
                    <select {...regProf('taxStatus')} className="input-field">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="HUF">HUF</option>
                      <option value="NRI">NRI</option>
                      <option value="PIO">PIO</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Annual Income</label>
                    <select {...regProf('annualIncome')} className="input-field">
                      <option value="">Select</option>
                      <option value="BELOW_1L">Below ₹1L</option>
                      <option value="1L_TO_5L">₹1L – 5L</option>
                      <option value="5L_TO_10L">₹5L – 10L</option>
                      <option value="10L_TO_25L">₹10L – 25L</option>
                      <option value="25L_TO_50L">₹25L – 50L</option>
                      <option value="50L_TO_1CR">₹50L – 1Cr</option>
                      <option value="ABOVE_1CR">Above ₹1Cr</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Occupation *</label>
                    <select {...regProf('occupation')} className="input-field">
                      <option value="SERVICE">Service</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="BUSINESS">Business</option>
                      <option value="AGRICULTURIST">Agriculturist</option>
                      <option value="RETIRED">Retired</option>
                      <option value="HOUSEWIFE">Housewife</option>
                      <option value="STUDENT">Student</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isPep" {...regProf('isPep')} className="w-4 h-4 accent-sparrow-blue" />
                    <label htmlFor="isPep" className="text-sm text-slate-700">Politically Exposed Person</label>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Gender *</label>
                    <select {...regProf('gender')} className="input-field">
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="T">Transgender</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Marital Status</label>
                    <select {...regProf('maritalStatus')} className="input-field">
                      <option value="">Select</option>
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="WIDOWED">Widowed</option>
                      <option value="DIVORCED">Divorced</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Place of Birth</label>
                    <input {...regProf('placeOfBirth')} placeholder="City / Town" className="input-field" />
                  </div>
                  <div>
                    <label className="field-label">Father / Spouse Name *</label>
                    <input {...regProf('fatherOrSpouseName')} placeholder="Father or spouse name" className="input-field" />
                    {profErr.fatherOrSpouseName && <p className="err">{profErr.fatherOrSpouseName.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Mother's Name</label>
                    <input {...regProf('motherName')} placeholder="Mother's name" className="input-field" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save Profile
                </button>
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow label="Name as on PAN"    value={profile?.fullNameAsPan} />
              <FieldRow label="PAN"               value={profile?.panNumber} />
              <FieldRow label="Date of Birth"     value={profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN') : undefined} />
              <FieldRow label="Occupation"        value={profile?.occupation ? OCCUPATIONS[profile.occupation] : undefined} />
              <FieldRow label="Annual Income"     value={profile?.annualIncome ? (INCOMES[profile.annualIncome] ?? profile.annualIncome) : undefined} />
              <FieldRow label="Tax Status"        value={profile?.taxStatus} />
              <FieldRow label="Holding Type"      value={profile?.holdingType ? (HOLDING[profile.holdingType] ?? profile.holdingType) : 'Single'} />
              <FieldRow label="Political Exposure" value={profile ? (profile.isPep ? 'Yes' : 'No') : undefined} />
            </div>
          )}
        </div>

        {/* ── Personal Details card ── */}
        <div className="card">
          <CardHeader
            icon={<User size={14} />}
            title="Personal Details"
            editing={editing === 'profile'}
            onEdit={() => setEditing(editing === 'profile' ? null : 'profile')}
          />
          {editing === 'profile' ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400 text-center">
              ← Complete all fields in the<br />PAN Details card and save
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow label="Mobile"          value={userInfo?.phone} />
              <FieldRow label="Email ID"        value={userInfo?.email} />
              <FieldRow label="Gender"          value={profile?.gender ? GENDERS[profile.gender] : undefined} />
              <FieldRow label="Marital Status"  value={profile?.maritalStatus ? (MARITAL[profile.maritalStatus] ?? profile.maritalStatus) : undefined} />
              <FieldRow label="Place of Birth"  value={profile?.placeOfBirth} />
              <FieldRow label="Father / Spouse" value={profile?.fatherOrSpouseName} />
              <FieldRow label="Mother's Name"   value={profile?.motherName} />
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          ROW 2 — Address Details  |  Nominee Details
      ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Address card ── */}
        <div className="card">
          <CardHeader
            icon={<MapPin size={14} />}
            title="Address Details"
            editing={editing === 'address'}
            onEdit={() => setEditing(editing === 'address' ? null : 'address')}
          />
          {editing === 'address' ? (
            <AddressEditForm
              permanent={permAddr}
              correspondence={corrAddr}
              onSave={async (perm, corr) => {
                setSaving(true)
                try {
                  await onboardingService.saveAddress({ type: 'PERMANENT', ...perm })
                  await onboardingService.saveAddress({ type: 'CORRESPONDENCE', ...corr })
                  setAddresses([
                    { type: 'PERMANENT',      ...perm },
                    { type: 'CORRESPONDENCE', ...corr },
                  ])
                  setEditing(null)
                  toast.success('Address saved!')
                } catch (e: any) {
                  toast.error(e?.response?.data?.message ?? 'Could not save address')
                } finally { setSaving(false) }
              }}
              saving={saving}
              onCancel={() => setEditing(null)}
            />
          ) : permAddr ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-sparrow-blue uppercase tracking-widest mb-2">Permanent Address</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <FieldRow label="Line 1"   value={permAddr.addressLine1} />
                  <FieldRow label="Line 2"   value={permAddr.addressLine2} />
                  <FieldRow label="City"     value={permAddr.city} />
                  <FieldRow label="State"    value={permAddr.state} />
                  <FieldRow label="Pin Code" value={permAddr.pincode} />
                  <FieldRow label="Country"  value={permAddr.country} />
                </div>
              </div>
              {corrAddr && corrAddr.addressLine1 !== permAddr.addressLine1 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Correspondence</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <FieldRow label="Line 1"   value={corrAddr.addressLine1} />
                    <FieldRow label="City"     value={corrAddr.city} />
                    <FieldRow label="State"    value={corrAddr.state} />
                    <FieldRow label="Pin Code" value={corrAddr.pincode} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No address added yet</p>
          )}
        </div>

        {/* ── Nominee card ── */}
        <div className="card">
          <CardHeader
            icon={<Users size={14} />}
            title="Nominee Details"
            editing={editing === 'nominee'}
            onEdit={() => setEditing(editing === 'nominee' ? null : 'nominee')}
          />
          {editing === 'nominee' ? (
            <NomineeEditForm
              initial={nominees}
              onSave={async (noms) => {
                setSaving(true)
                try {
                  await onboardingService.saveNominees(noms)
                  setNominees(noms)
                  setEditing(null)
                  toast.success('Nominees saved!')
                } catch (e: any) {
                  toast.error(e?.response?.data?.message ?? 'Could not save nominees')
                } finally { setSaving(false) }
              }}
              saving={saving}
              onCancel={() => setEditing(null)}
            />
          ) : nominees.length > 0 ? (
            <div className="space-y-4">
              {nominees.map((n, i) => (
                <div key={i} className={i > 0 ? 'border-t border-slate-100 pt-4' : ''}>
                  <p className="text-[10px] font-bold text-sparrow-blue uppercase tracking-widest mb-2">Nominee {i + 1}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <FieldRow label="Name"      value={n.fullName} />
                    <FieldRow label="Relation"  value={n.relationship ? n.relationship.charAt(0) + n.relationship.slice(1).toLowerCase() : undefined} />
                    <FieldRow label="DOB"       value={n.dob ? new Date(n.dob).toLocaleDateString('en-IN') : undefined} />
                    <FieldRow label="Share"     value={`${n.percentage}%`} />
                    <FieldRow label="ID Type"   value={n.docType} />
                    <FieldRow label="ID Number" value={n.docNumber} />
                    <FieldRow label="Email"     value={n.email} />
                    <FieldRow label="Phone"     value={n.phone} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No nominees added yet</p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          ROW 3 — Bank Details
      ════════════════════════════════════════════════ */}
      <div className="card">
        <CardHeader
          icon={<Building2 size={14} />}
          title="Bank Details"
          editing={editing === 'bank'}
          onEdit={() => setEditing(editing === 'bank' ? null : 'bank')}
        />
        {editing === 'bank' ? (
          <BankEditForm
            accounts={bankAccounts}
            onAdded={(acc) => { setBankAccounts((p) => [...p, acc]); setEditing(null) }}
            onDeleted={(id) => setBankAccounts((p) => p.filter((a) => a.id !== id))}
            onCancel={() => setEditing(null)}
          />
        ) : bankAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {acc.isDefault && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-3">
                    <CheckCircle2 size={10} /> Primary Account
                  </span>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
                  <FieldRow label="Account No."    value={acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : undefined} />
                  <FieldRow label="IFSC"           value={acc.ifscCode} />
                  <FieldRow label="Account Type"   value={acc.accountType === 'SB' ? 'Savings' : acc.accountType === 'CB' ? 'Current' : acc.accountType} />
                  <FieldRow label="Bank"           value={acc.bankName} />
                  <FieldRow label="Account Holder" value={acc.accountHolder} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-8 text-center">No bank account added yet</p>
        )}
      </div>

      {/* Back to status */}
      {!editing && (
        <div className="flex justify-end pt-2">
          <button type="button" onClick={() => navigate('/onboarding/status')} className="btn-primary">
            Back to Status
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  ADDRESS EDIT FORM
// ═══════════════════════════════════════════════════════════

type AddrForm = Omit<AddressData, 'type'>
const emptyAddr = (): AddrForm => ({
  addressLine1: '', addressLine2: '', city: '', district: '',
  state: '', pincode: '', country: 'India',
})

function AddressEditForm({
  permanent, correspondence, onSave, saving, onCancel,
}: {
  permanent?:      AddressData
  correspondence?: AddressData
  onSave:   (perm: AddrForm, corr: AddrForm) => Promise<void>
  saving:   boolean
  onCancel: () => void
}) {
  const [perm, setPerm] = useState<AddrForm>({ ...emptyAddr(), ...(permanent      ? { ...permanent }      : {}) })
  const [corr, setCorr] = useState<AddrForm>({ ...emptyAddr(), ...(correspondence ? { ...correspondence } : {}) })
  const [same, setSame] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})

  function setF(which: 'perm' | 'corr', key: keyof AddrForm, val: string) {
    if (which === 'perm') setPerm((p) => ({ ...p, [key]: val }))
    else                  setCorr((p) => ({ ...p, [key]: val }))
    setErrs((e) => { const n = { ...e }; delete n[`${which}.${key}`]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    const check = (f: AddrForm, pfx: string) => {
      if (!f.addressLine1.trim())      e[`${pfx}.addressLine1`] = 'Required'
      if (!f.city.trim())              e[`${pfx}.city`]         = 'Required'
      if (!f.state)                    e[`${pfx}.state`]        = 'Required'
      if (!/^\d{6}$/.test(f.pincode)) e[`${pfx}.pincode`]      = '6-digit pincode'
    }
    check(perm, 'perm')
    if (!same) check(corr, 'corr')
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    onSave(perm, same ? { ...perm } : corr)
  }

  function AddrBlock({ which, data, label }: { which: 'perm' | 'corr'; data: AddrForm; label: string }) {
    return (
      <div>
        <p className="text-[10px] font-bold text-sparrow-blue uppercase tracking-widest mb-3">{label}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="field-label">Line 1 *</label>
            <input value={data.addressLine1} onChange={(e) => setF(which, 'addressLine1', e.target.value)} className="input-field" />
            {errs[`${which}.addressLine1`] && <p className="err">{errs[`${which}.addressLine1`]}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Line 2</label>
            <input value={data.addressLine2 ?? ''} onChange={(e) => setF(which, 'addressLine2', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="field-label">City *</label>
            <input value={data.city} onChange={(e) => setF(which, 'city', e.target.value)} className="input-field" />
            {errs[`${which}.city`] && <p className="err">{errs[`${which}.city`]}</p>}
          </div>
          <div>
            <label className="field-label">State *</label>
            <select value={data.state} onChange={(e) => setF(which, 'state', e.target.value)} className="input-field">
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errs[`${which}.state`] && <p className="err">{errs[`${which}.state`]}</p>}
          </div>
          <div>
            <label className="field-label">Pin Code *</label>
            <input value={data.pincode} maxLength={6} onChange={(e) => setF(which, 'pincode', e.target.value)} className="input-field" />
            {errs[`${which}.pincode`] && <p className="err">{errs[`${which}.pincode`]}</p>}
          </div>
          <div>
            <label className="field-label">Country</label>
            <input value={data.country} onChange={(e) => setF(which, 'country', e.target.value)} className="input-field" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">
      <AddrBlock which="perm" data={perm} label="Permanent Address" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} className="w-4 h-4 accent-sparrow-blue" />
        <span className="text-sm text-slate-700">Correspondence same as Permanent</span>
      </label>
      {!same && <AddrBlock which="corr" data={corr} label="Correspondence Address" />}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />} Save Address
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  NOMINEE EDIT FORM
// ═══════════════════════════════════════════════════════════

const emptyNominee = (): NomineeData => ({
  fullName: '', relationship: '', dob: '', percentage: 100,
  guardianName: '', guardianRel: '', docType: '', docNumber: '', email: '', phone: '',
})

function NomineeEditForm({
  initial, onSave, saving, onCancel,
}: {
  initial:  NomineeData[]
  onSave:   (noms: NomineeData[]) => Promise<void>
  saving:   boolean
  onCancel: () => void
}) {
  const [noms, setNoms] = useState<NomineeData[]>(initial.length > 0 ? initial : [emptyNominee()])
  const [errs, setErrs] = useState<Record<string, string>>({})
  const total = noms.reduce((s, n) => s + Number(n.percentage || 0), 0)

  function set(i: number, key: keyof NomineeData, val: string | number) {
    setNoms((p) => { const n = [...p]; n[i] = { ...n[i], [key]: val }; return n })
    setErrs((e) => { const n = { ...e }; delete n[`${i}.${key}`]; return n })
  }

  function addNom() {
    if (noms.length >= 3) return
    setNoms((p) => [...p, { ...emptyNominee(), percentage: Math.max(0, 100 - total) }])
  }

  function removeNom(i: number) {
    if (noms.length === 1) return
    const removed = Number(noms[i].percentage)
    const next = noms.filter((_, idx) => idx !== i)
    next[0] = { ...next[0], percentage: Number(next[0].percentage) + removed }
    setNoms(next)
  }

  function validate() {
    const e: Record<string, string> = {}
    noms.forEach((n, i) => {
      if (!n.fullName.trim())       e[`${i}.fullName`]     = 'Required'
      if (!n.relationship)          e[`${i}.relationship`] = 'Required'
      if (Number(n.percentage) < 1) e[`${i}.percentage`]   = 'Min 1%'
      if (n.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)) e[`${i}.email`] = 'Invalid email'
      if (n.phone && !/^\d{10}$/.test(String(n.phone)))             e[`${i}.phone`] = '10 digits required'
      if (isMinor(n.dob) && !n.guardianName?.trim()) e[`${i}.guardianName`] = 'Guardian required for minor'
    })
    if (total !== 100) e['total'] = `Percentages must total 100% (currently ${total}%)`
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    onSave(noms.map((n) => ({
      ...n,
      dob:         n.dob         || undefined,
      guardianName: n.guardianName || undefined,
      guardianRel:  n.guardianRel  || undefined,
      docType:      n.docType      || undefined,
      docNumber:    n.docNumber    || undefined,
      email:        n.email        || undefined,
      phone:        n.phone        || undefined,
    })))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">
      {noms.map((n, i) => (
        <div key={i} className={`space-y-3 ${i > 0 ? 'border-t border-slate-100 pt-4' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-sparrow-blue uppercase tracking-widest">Nominee {i + 1}</p>
            {noms.length > 1 && (
              <button type="button" onClick={() => removeNom(i)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Full Name *</label>
              <input value={n.fullName} onChange={(e) => set(i, 'fullName', e.target.value)} className="input-field" />
              {errs[`${i}.fullName`] && <p className="err">{errs[`${i}.fullName`]}</p>}
            </div>
            <div>
              <label className="field-label">Relationship *</label>
              <select value={n.relationship} onChange={(e) => set(i, 'relationship', e.target.value)} className="input-field">
                <option value="">Select</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
              {errs[`${i}.relationship`] && <p className="err">{errs[`${i}.relationship`]}</p>}
            </div>
            <div>
              <label className="field-label">Date of Birth</label>
              <DateInput value={n.dob ?? ''} onChange={(v) => set(i, 'dob', v)} />
            </div>
            <div>
              <label className="field-label">Share % *</label>
              <input
                type="number" min={1} max={100}
                value={n.percentage}
                onChange={(e) => set(i, 'percentage', Number(e.target.value))}
                className="input-field"
              />
              {errs[`${i}.percentage`] && <p className="err">{errs[`${i}.percentage`]}</p>}
            </div>
            <div>
              <label className="field-label">Identity Type</label>
              <select value={n.docType ?? ''} onChange={(e) => set(i, 'docType', e.target.value)} className="input-field">
                <option value="">Select</option>
                <option value="AADHAAR">Aadhaar</option>
                <option value="PAN">PAN</option>
                <option value="PASSPORT">Passport</option>
                <option value="VOTER_ID">Voter ID</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            <div>
              <label className="field-label">Identity Number</label>
              <input value={n.docNumber ?? ''} onChange={(e) => set(i, 'docNumber', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" value={n.email ?? ''} onChange={(e) => set(i, 'email', e.target.value)} className="input-field" placeholder="nominee@email.com" />
              {errs[`${i}.email`] && <p className="err">{errs[`${i}.email`]}</p>}
            </div>
            <div>
              <label className="field-label">Phone Number</label>
              <input type="tel" value={n.phone ?? ''} maxLength={10} onChange={(e) => set(i, 'phone', e.target.value)} className="input-field" placeholder="10-digit mobile" />
              {errs[`${i}.phone`] && <p className="err">{errs[`${i}.phone`]}</p>}
            </div>
            {isMinor(n.dob) && (
              <>
                <div>
                  <label className="field-label">Guardian Name *</label>
                  <input value={n.guardianName ?? ''} onChange={(e) => set(i, 'guardianName', e.target.value)} className="input-field" />
                  {errs[`${i}.guardianName`] && <p className="err">{errs[`${i}.guardianName`]}</p>}
                </div>
                <div>
                  <label className="field-label">Guardian Relation</label>
                  <input value={n.guardianRel ?? ''} onChange={(e) => set(i, 'guardianRel', e.target.value)} className="input-field" />
                </div>
              </>
            )}
          </div>
        </div>
      ))}

      {errs['total'] && <p className="text-red-500 text-sm font-medium">{errs['total']}</p>}
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${total === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
          Total: {total}% {total === 100 ? '✓' : ''}
        </span>
        {noms.length < 3 && (
          <button type="button" onClick={addNom} className="flex items-center gap-1.5 text-sparrow-blue hover:text-blue-700">
            <Plus size={14} /> Add Nominee
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />} Save Nominees
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  BANK EDIT FORM
// ═══════════════════════════════════════════════════════════

function BankEditForm({
  accounts, onAdded, onDeleted, onCancel,
}: {
  accounts:  BankData[]
  onAdded:   (acc: BankData) => void
  onDeleted: (id: string)   => void
  onCancel:  () => void
}) {
  const [bank, setBank]     = useState({ accountNumber: '', ifscCode: '', bankName: '', accountHolder: '', accountType: 'SB' })
  const [errs, setErrs]     = useState<Partial<typeof bank>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  function setF(key: keyof typeof bank, val: string) {
    setBank((p) => ({ ...p, [key]: val }))
    setErrs((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e: Partial<typeof bank> = {}
    if (!/^\d{9,18}$/.test(bank.accountNumber))                       e.accountNumber = '9–18 digits required'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.toUpperCase())) e.ifscCode      = 'Invalid IFSC (e.g. SBIN0001234)'
    if (!bank.bankName.trim())                                         e.bankName      = 'Required'
    if (!bank.accountHolder.trim())                                    e.accountHolder = 'Required'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const res = await bankService.addAccount({
        ...bank,
        ifscCode:  bank.ifscCode.toUpperCase(),
        isDefault: accounts.length === 0,
      })
      onAdded(res.data ?? res)
      toast.success('Bank account added!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not add bank account')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await bankService.deleteAccount(id)
      onDeleted(id)
    } catch {
      toast.error('Could not remove account')
    } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5 pt-1">
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {acc.bankName} — ••••{acc.accountNumber.slice(-4)}
                  {acc.isDefault && (
                    <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Primary</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {acc.ifscCode} · {acc.accountType === 'SB' ? 'Savings' : acc.accountType === 'CB' ? 'Current' : acc.accountType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => acc.id && handleDelete(acc.id)}
                disabled={deleting === acc.id}
                className="text-red-400 hover:text-red-600 p-1.5"
              >
                {deleting === acc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Bank Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Account Number *</label>
            <input value={bank.accountNumber} onChange={(e) => setF('accountNumber', e.target.value)} className="input-field" placeholder="9–18 digit account number" />
            {errs.accountNumber && <p className="err">{errs.accountNumber}</p>}
          </div>
          <div>
            <label className="field-label">IFSC Code *</label>
            <input value={bank.ifscCode} onChange={(e) => setF('ifscCode', e.target.value.toUpperCase())} className="input-field uppercase" placeholder="SBIN0001234" />
            {errs.ifscCode && <p className="err">{errs.ifscCode}</p>}
          </div>
          <div>
            <label className="field-label">Bank Name *</label>
            <input value={bank.bankName} onChange={(e) => setF('bankName', e.target.value)} className="input-field" placeholder="State Bank of India" />
            {errs.bankName && <p className="err">{errs.bankName}</p>}
          </div>
          <div>
            <label className="field-label">Account Holder *</label>
            <input value={bank.accountHolder} onChange={(e) => setF('accountHolder', e.target.value)} className="input-field" placeholder="Name as on bank records" />
            {errs.accountHolder && <p className="err">{errs.accountHolder}</p>}
          </div>
          <div>
            <label className="field-label">Account Type</label>
            <select value={bank.accountType} onChange={(e) => setF('accountType', e.target.value)} className="input-field">
              <option value="SB">Savings</option>
              <option value="CB">Current</option>
              <option value="NRE">NRE</option>
              <option value="NRO">NRO</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <CreditCard size={14} /> Add Account
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Done</button>
        </div>
      </form>
    </div>
  )
}
