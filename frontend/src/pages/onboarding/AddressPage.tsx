import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { onboardingService } from '../../services/onboardingService'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

interface AddressForm {
  addressLine1: string
  addressLine2: string
  city: string
  district: string
  state: string
  pincode: string
  country: string
}

const emptyForm: AddressForm = {
  addressLine1: '', addressLine2: '', city: '',
  district: '', state: '', pincode: '', country: 'India',
}

export default function AddressPage() {
  const navigate = useNavigate()

  const [permanent, setPermanent]       = useState<AddressForm>({ ...emptyForm })
  const [correspondence, setCorrespondence] = useState<AddressForm>({ ...emptyForm })
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [fetching, setFetching]         = useState(true)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  // Load existing addresses
  useEffect(() => {
    onboardingService.getAddresses()
      .then((list: any[]) => {
        list.forEach((addr: any) => {
          const form: AddressForm = {
            addressLine1: addr.addressLine1 ?? '',
            addressLine2: addr.addressLine2 ?? '',
            city:         addr.city ?? '',
            district:     addr.district ?? '',
            state:        addr.state ?? '',
            pincode:      addr.pincode ?? '',
            country:      addr.country ?? 'India',
          }
          if (addr.type === 'PERMANENT')      setPermanent(form)
          if (addr.type === 'CORRESPONDENCE') setCorrespondence(form)
        })
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  function validate() {
    const errs: Record<string, string> = {}
    const check = (form: AddressForm, prefix: string) => {
      if (!form.addressLine1.trim()) errs[`${prefix}.addressLine1`] = 'Address line 1 required'
      if (!form.city.trim())         errs[`${prefix}.city`]         = 'City required'
      if (!form.state)               errs[`${prefix}.state`]        = 'State required'
      if (!/^\d{6}$/.test(form.pincode)) errs[`${prefix}.pincode`] = 'Valid 6-digit pincode required'
    }
    check(permanent, 'perm')
    if (!sameAsPermanent) check(correspondence, 'corr')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await onboardingService.saveAddress({ type: 'PERMANENT', ...permanent })
      await onboardingService.saveAddress({
        type: 'CORRESPONDENCE',
        ...(sameAsPermanent ? permanent : correspondence),
      })
      toast.success('Addresses saved successfully!')
      navigate('/onboarding/nominees')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-sparrow-blue border-t-transparent rounded-full" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Address Details</h1>
        <p className="text-gray-500 mt-1 text-sm">Required for NSE MF registration (SEBI mandate)</p>
      </div>

      {/* Permanent Address */}
      <AddressSection
        title="Permanent Address"
        prefix="perm"
        form={permanent}
        onChange={setPermanent}
        errors={errors}
      />

      {/* Same as permanent toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sameAsPermanent}
          onChange={(e) => setSameAsPermanent(e.target.checked)}
          className="w-4 h-4 accent-sparrow-blue"
        />
        <span className="text-sm font-medium text-gray-700">
          Correspondence address same as permanent address
        </span>
      </label>

      {/* Correspondence Address */}
      {!sameAsPermanent && (
        <AddressSection
          title="Correspondence Address"
          prefix="corr"
          form={correspondence}
          onChange={setCorrespondence}
          errors={errors}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => navigate('/onboarding/profile')}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </form>
  )
}

// ─── Sub-component ────────────────────────────────────────

interface AddressSectionProps {
  title:    string
  prefix:   string
  form:     AddressForm
  onChange: (form: AddressForm) => void
  errors:   Record<string, string>
}

function AddressSection({ title, prefix, form, onChange, errors }: AddressSectionProps) {
  function set(field: keyof AddressForm, value: string) {
    onChange({ ...form, [field]: value })
  }
  const err = (field: string) => errors[`${prefix}.${field}`]

  return (
    <div className="card space-y-4">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">{title}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <input
          className="input-field"
          placeholder="House / Flat No., Street Name"
          value={form.addressLine1}
          onChange={(e) => set('addressLine1', e.target.value)}
          maxLength={200}
        />
        {err('addressLine1') && <p className="text-red-500 text-xs mt-1">{err('addressLine1')}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
        <input
          className="input-field"
          placeholder="Landmark, Area (optional)"
          value={form.addressLine2}
          onChange={(e) => set('addressLine2', e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            placeholder="Mumbai"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
          />
          {err('city') && <p className="text-red-500 text-xs mt-1">{err('city')}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <input
            className="input-field"
            placeholder="Optional"
            value={form.district}
            onChange={(e) => set('district', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            className="input-field"
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {err('state') && <p className="text-red-500 text-xs mt-1">{err('state')}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            placeholder="400001"
            value={form.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
          />
          {err('pincode') && <p className="text-red-500 text-xs mt-1">{err('pincode')}</p>}
        </div>
      </div>
    </div>
  )
}
