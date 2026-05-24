import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle } from 'lucide-react';
import { goalService } from '../../services/phase3Service';
import toast from 'react-hot-toast';

const GOAL_TYPES = [
  { emoji: '🏠', label: 'Home'       },
  { emoji: '🎓', label: 'Education'  },
  { emoji: '✈️', label: 'Travel'     },
  { emoji: '🛡️', label: 'Emergency' },
  { emoji: '💍', label: 'Wedding'    },
  { emoji: '🎯', label: 'Custom'     },
];

export default function CreateGoalPage() {
  const [goalName, setGoalName]     = useState('');
  const [targetAmt, setTargetAmt]   = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [calcResult, setCalcResult] = useState<{ monthlySip: number; months: number } | null>(null);
  const [calculating, setCalc]      = useState(false);
  const navigate                    = useNavigate();

  // Auto-calculate whenever targetAmt / targetDate change
  useEffect(() => {
    const amt  = parseFloat(targetAmt);
    const date = targetDate;
    if (!amt || !date || new Date(date) <= new Date()) { setCalcResult(null); return; }
    const t = setTimeout(async () => {
      setCalc(true);
      try {
        const res = await goalService.calculate(amt, date);
        setCalcResult(res);
      } catch { setCalcResult(null); }
      finally { setCalc(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [targetAmt, targetDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(targetAmt);
    if (!goalName.trim() || isNaN(amt) || amt <= 0 || !targetDate) {
      toast.error('Please fill all fields'); return;
    }
    if (new Date(targetDate) <= new Date()) {
      toast.error('Target date must be in the future'); return;
    }
    setLoading(true);
    try {
      await goalService.create({ goalName: goalName.trim(), targetAmount: amt, targetDate });
      setSuccess(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to create goal');
    } finally { setLoading(false); }
  }

  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  if (success) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Goal Created!</h2>
      <p className="text-gray-600 mb-1 font-semibold">{goalName}</p>
      <p className="text-gray-500 mb-6 text-sm">
        Target: ₹{parseFloat(targetAmt).toLocaleString('en-IN')} by {new Date(targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
      </p>
      {calcResult && (
        <div className="card bg-blue-50 border-blue-100 mb-6 text-left">
          <p className="text-sm text-gray-700">To reach this goal, start a SIP of</p>
          <p className="text-2xl font-bold text-sparrow-blue">₹{Math.ceil(calcResult.monthlySip).toLocaleString()}/mo</p>
          <p className="text-xs text-gray-500 mt-1">for {calcResult.months} months</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => navigate('/sip/create')} className="btn-primary flex-1">Start SIP</button>
        <button onClick={() => navigate('/goals')} className="btn-secondary flex-1">View Goals</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Create Goal</h1>
      </div>

      {/* Goal type picker */}
      <div>
        <p className="field-label mb-2">Goal Type</p>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_TYPES.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => !goalName && setGoalName(g.label)}
              className={`flex flex-col items-center py-3 rounded-xl border text-sm transition-colors ${
                goalName.toLowerCase() === g.label.toLowerCase()
                  ? 'bg-sparrow-blue/10 border-sparrow-blue text-sparrow-blue font-semibold'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-sparrow-blue'
              }`}
            >
              <span className="text-xl mb-1">{g.emoji}</span>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Goal name */}
        <div>
          <label className="field-label">Goal Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g., Dream Home Down Payment"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            required
          />
        </div>

        {/* Target amount */}
        <div>
          <label className="field-label">Target Amount (₹)</label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g., 2000000"
            value={targetAmt}
            onChange={(e) => setTargetAmt(e.target.value)}
            min="1000"
            required
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {[100000,500000,1000000,2500000,5000000].map((v) => (
              <button
                key={v} type="button"
                onClick={() => setTargetAmt(String(v))}
                className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                  targetAmt === String(v)
                    ? 'bg-sparrow-blue text-white border-sparrow-blue'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sparrow-blue'
                }`}
              >
                ₹{v >= 1e7 ? `${v / 1e7}Cr` : v >= 1e5 ? `${v / 1e5}L` : v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Target date */}
        <div>
          <label className="field-label">Target Date</label>
          <input
            type="date"
            className="input-field"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={minDateStr}
            required
          />
        </div>

        {/* SIP Calculator result */}
        {(calcResult || calculating) && (
          <div className="card bg-blue-50 border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-sparrow-blue" />
              <p className="text-sm font-semibold text-gray-800">SIP Calculator</p>
            </div>
            {calculating ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sparrow-blue" />
                Calculating…
              </div>
            ) : calcResult && (
              <>
                <p className="text-sm text-gray-600">To reach your target you need</p>
                <p className="text-2xl font-bold text-sparrow-blue">
                  ₹{Math.ceil(calcResult.monthlySip).toLocaleString('en-IN')}/mo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  for {calcResult.months} months @ 12% p.a. expected return
                </p>
              </>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create Goal'}
        </button>
      </form>
    </div>
  );
}
