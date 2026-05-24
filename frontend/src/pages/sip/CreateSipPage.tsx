import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle } from 'lucide-react';
import { fundService } from '../../services/fundService';
import { goalService, sipService } from '../../services/phase3Service';
import type { Fund } from '../../services/fundService';
import type { Goal } from '../../services/phase3Service';
import toast from 'react-hot-toast';

const FREQUENCIES = [
  { value: 'MONTHLY',   label: 'Monthly'   },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'WEEKLY',    label: 'Weekly'    },
];

const SIP_DATES = [1,5,7,10,15,20,25,28];

export default function CreateSipPage() {
  const [step, setStep]             = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearch]    = useState('');
  const [searchResults, setResults] = useState<Fund[]>([]);
  const [searching, setSearching]   = useState(false);
  const [selectedFund, setFund]     = useState<Fund | null>(null);
  const [amount, setAmount]         = useState('');
  const [frequency, setFrequency]   = useState('MONTHLY');
  const [sipDate, setSipDate]       = useState(10);
  const [goalId, setGoalId]         = useState('');
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const navigate                    = useNavigate();
  const [params]                    = useSearchParams();

  useEffect(() => {
    // Pre-fill fund if coming from FundDetailPage via ?fundId=...
    const fid = params.get('fundId');
    if (fid) {
      fundService.getById(fid).then((f) => { setFund(f); setStep(2); }).catch(() => {});
    }
    goalService.list().then(setGoals).catch(() => {});
  }, []);

  // Debounced fund search
  useEffect(() => {
    if (step !== 1 || searchQuery.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fundService.list({ q: searchQuery, limit: 8 });
        setResults(res.funds);
      } catch {} finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, step]);

  async function handleSubmit() {
    if (!selectedFund) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < selectedFund.minSipAmount) {
      toast.error(`Minimum SIP is ₹${selectedFund.minSipAmount}`); return;
    }
    setLoading(true);
    try {
      const today = new Date();
      today.setDate(sipDate);
      if (today <= new Date()) today.setMonth(today.getMonth() + 1);

      await sipService.create({
        fundId: selectedFund.id,
        amount: amt,
        sipDate,
        startDate: today.toISOString(),
        frequency,
        goalId: goalId || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to create SIP');
    } finally { setLoading(false); }
  }

  if (success) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">SIP Created!</h2>
      <p className="text-gray-600 mb-1">
        ₹{parseFloat(amount).toLocaleString('en-IN')}/{frequency.toLowerCase()} SIP in
      </p>
      <p className="font-semibold text-gray-800 mb-6">{selectedFund?.schemeName}</p>
      <p className="text-sm text-gray-500 mb-6">First installment on {sipDate}th of next month</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/sip')} className="btn-primary flex-1">View My SIPs</button>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">Go Home</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep((s) => (s - 1) as 1) : navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Start SIP</h1>
          <p className="text-xs text-gray-500">Step {step} of 3</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-sparrow-blue' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* ─── Step 1: Fund Selection ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search mutual funds…"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searching && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sparrow-blue mx-auto" />
            </div>
          )}

          {searchResults.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFund(f); setStep(2); }}
              className="w-full card text-left hover:shadow-md transition-shadow"
            >
              <p className="font-semibold text-gray-900 text-sm">{f.schemeName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.fundHouse} · {f.category}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-gray-400">NAV: ₹{f.nav?.toFixed(2) ?? '—'}</span>
                <span className="text-xs text-gray-400">Min SIP: ₹{f.minSipAmount}</span>
              </div>
            </button>
          ))}

          {searchQuery.length > 1 && !searching && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No funds found</p>
          )}
          {searchQuery.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Start typing to search funds</p>
          )}
        </div>
      )}

      {/* ─── Step 2: SIP Details ─── */}
      {step === 2 && selectedFund && (
        <div className="space-y-5">
          <div className="card bg-blue-50 border-blue-100">
            <p className="font-semibold text-gray-900 text-sm">{selectedFund.schemeName}</p>
            <p className="text-xs text-gray-500">{selectedFund.fundHouse} · {selectedFund.category}</p>
            <p className="text-xs text-sparrow-blue mt-1">NAV: ₹{selectedFund.nav?.toFixed(2) ?? '—'} · Min: ₹{selectedFund.minSipAmount}</p>
          </div>

          {/* Amount */}
          <div>
            <label className="field-label">Monthly Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              placeholder={`Min ₹${selectedFund.minSipAmount}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[500,1000,2500,5000,10000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    amount === String(v) ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-sparrow-blue'
                  }`}
                >
                  ₹{v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="field-label">Frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <button key={f.value} onClick={() => setFrequency(f.value)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    frequency === f.value ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-sparrow-blue'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* SIP Date */}
          <div>
            <label className="field-label">SIP Date (day of month)</label>
            <div className="flex flex-wrap gap-2">
              {SIP_DATES.map((d) => (
                <button key={d} onClick={() => setSipDate(d)}
                  className={`w-10 h-10 rounded-full text-sm border transition-colors ${
                    sipDate === d ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-sparrow-blue'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Link to goal (optional) */}
          {goals.length > 0 && (
            <div>
              <label className="field-label">Link to Goal (optional)</label>
              <select className="input-field" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">— No goal —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.goalName} (₹{g.targetAmount.toLocaleString()})</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              const amt = parseFloat(amount);
              if (!amount || isNaN(amt) || amt < selectedFund.minSipAmount) {
                toast.error(`Minimum SIP is ₹${selectedFund.minSipAmount}`); return;
              }
              setStep(3);
            }}
            className="btn-primary w-full"
          >
            Review SIP →
          </button>
        </div>
      )}

      {/* ─── Step 3: Review ─── */}
      {step === 3 && selectedFund && (
        <div className="space-y-5">
          <h2 className="font-semibold text-gray-800">Review Your SIP</h2>

          <div className="card space-y-3">
            <Row label="Fund"       value={selectedFund.schemeName} />
            <Row label="Amount"     value={`₹${parseFloat(amount).toLocaleString('en-IN')} per month`} />
            <Row label="Frequency"  value={frequency.charAt(0) + frequency.slice(1).toLowerCase()} />
            <Row label="SIP Date"   value={`${sipDate}th of every month`} />
            {goalId && goals.find((g) => g.id === goalId) && (
              <Row label="Goal"     value={goals.find((g) => g.id === goalId)!.goalName} />
            )}
          </div>

          <div className="card bg-amber-50 border-amber-100">
            <p className="text-xs text-amber-800">
              Your first installment of ₹{parseFloat(amount).toLocaleString('en-IN')} will be processed on the {sipDate}th of next month. You can pause or cancel anytime.
            </p>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating SIP…' : 'Confirm & Start SIP'}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
