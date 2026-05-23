import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bankService } from '../../services/onboardingService'
import { useDraft } from '../../hooks/useDraft'

interface BankAccount {
  id:            string
  accountNumber: string
  ifscCode:      string
  bankName:      string
  accountHolder: string
  accountType:   string
  isDefault:     boolean
  isVerified:    boolean
  createdAt:     string
}

interface FormData {
  accountNumber: string
  ifscCode:      string
  bankName:      string
  accountHolder: string
  accountType:   string
}

const emptyForm: FormData = { accountNumber: '', ifscCode: '', bankName: '', accountHolder: '', accountType: 'SB' }

// Mask account number for display
function maskAccount(num: string) {
  return num.length > 4 ? 'XXXX' + num.slice(-4) : num
}

export default function BankPage() {
  const navigate  = useNavigate()
  const draft = useDraft<FormData>('onboarding_bank')
  const [accounts, setAccounts]   = useState<BankAccount[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState<FormData>(() => draft.load() ?? { ...emptyForm })
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(true)
  const [errors, setErrors]       = useState<Partial<FormData>>({})

  useEffect(() => {
    bankService.getAccounts()
      .then(setAccounts)
      .catch(() => {})
      .finally(() => {
        setFetching(false)
        // If no accounts, open form automatically
        setShowForm(true)
      })
  }, [])

  useEffect(() => {
    if (!fetching && accounts.length === 0) setShowForm(true)
    if (!fetching && accounts.length > 0)   setShowForm(false)
  }, [fetching, accounts.length])

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      draft.save(next)   // auto-save on every keystroke
      return next
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function validate(): boolean {
    const errs: Partial<FormData> = {}
    if (!/^\d{9,18}$/.test(form.accountNumber))
      errs.accountNumber = 'Account number must be 9–18 digits'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase()))
      errs.ifscCode = 'Invalid IFSC code (e.g. SBIN0001234)'
    if (!form.bankName.trim())      errs.bankName      = 'Bank name required'
    if (!form.accountHolder.trim()) errs.accountHolder = 'Account holder name required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const result = await bankService.addAccount({
        ...form,
        ifscCode: form.ifscCode.toUpperCase(),
        isDefault: accounts.length === 0,
      })
      setAccounts((prev) => [...prev, result.data])
      setForm({ ...emptyForm })
      draft.clear()   // ← clear draft after successful add
      setShowForm(false)
      toast.success('Bank account added!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add bank account')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await bankService.setDefault(id)
      setAccounts((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })))
      toast.success('Default bank account updated')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this bank account?')) return
    try {
      await bankService.deleteAccount(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      toast.success('Bank account removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-sparrow-blue border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bank Account</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Add your bank account for mutual fund investments and redemptions.
        </p>
      </div>

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div
              key={a.id}
              className={`card flex items-start justify-between gap-4 ${a.isDefault ? 'ring-2 ring-sparrow-blue' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl shrink-0">
                  🏦
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{a.bankName}</p>
                  <p className="text-sm text-gray-600">A/C: {maskAccount(a.accountNumber)}</p>
                  <p className="text-xs text-gray-500">IFSC: {a.ifscCode} · {a.accountHolder}</p>
                  <p className="text-xs text-gray-500">Type: {a.accountType === 'SB' ? 'Savings' : a.accountType === 'CA' ? 'Current' : a.accountType ?? 'Savings'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {a.isDefault && (
                      <span className="text-xs bg-blue-100 text-sparrow-blue px-2 py-0.5 rounded-full font-medium">
                        Default
                      </span>
                    )}
                    {a.isVerified ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                        Pending verification
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {!a.isDefault && (
                  <button
                    onClick={() => handleSetDefault(a.id)}
                    className="text-xs text-sparrow-blue hover:underline font-medium"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add account button */}
      {accounts.length < 5 && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-sparrow-blue hover:text-sparrow-blue transition-colors"
        >
          + Add Bank Account ({accounts.length}/5)
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
            Add Bank Account
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="9–18 digit account number"
              value={form.accountNumber}
              onChange={(e) => setField('accountNumber', e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={18}
            />
            {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field uppercase"
              placeholder="e.g. SBIN0001234"
              value={form.ifscCode}
              onChange={(e) => setField('ifscCode', e.target.value.toUpperCase())}
              maxLength={11}
            />
            {errors.ifscCode && <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. State Bank of India"
              value={form.bankName}
              onChange={(e) => setField('bankName', e.target.value)}
            />
            {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="As per bank records"
              value={form.accountHolder}
              onChange={(e) => setField('accountHolder', e.target.value)}
            />
            {errors.accountHolder && <p className="text-red-500 text-xs mt-1">{errors.accountHolder}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={form.accountType}
              onChange={(e) => setField('accountType', e.target.value)}
            >
              <option value="SB">Savings Account</option>
              <option value="CA">Current Account</option>
              <option value="NRE">NRE Account</option>
              <option value="NRO">NRO Account</option>
            </select>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            ℹ️ Bank account verification (penny drop) will be done in Phase 2 before processing transactions.
          </div>

          <div className="flex gap-3">
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ ...emptyForm }); setErrors({}) }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding…' : 'Add Account'}
            </button>
          </div>
        </form>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => navigate('/onboarding/nominees')}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        {accounts.length > 0 && (
          <button
            onClick={() => navigate('/onboarding/kyc')}
            className="btn-primary px-6 py-2.5"
          >
            Continue to KYC →
          </button>
        )}
      </div>
    </div>
  )
}
