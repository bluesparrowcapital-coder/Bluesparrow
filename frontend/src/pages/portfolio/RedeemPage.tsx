import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { portfolioService, type Holding } from '../../services/fundService';
import toast from 'react-hot-toast';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function RedeemPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate        = useNavigate();
  const [holding, setHolding]     = useState<Holding | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isFull, setIsFull]       = useState(false);
  const [units, setUnits]         = useState('');
  const [submitting, setSub]      = useState(false);
  const [success, setSuccess]     = useState(false);
  const [step, setStep]           = useState<'form' | 'review'>('form');

  useEffect(() => {
    portfolioService.get().then((data) => {
      const h = data.holdings.find((x) => x.id === portfolioId);
      if (!h) { toast.error('Holding not found'); navigate('/portfolio'); return; }
      setHolding(h);
    }).catch(() => { toast.error('Failed to load holding'); navigate('/portfolio'); })
      .finally(() => setLoading(false));
  }, [portfolioId]);

  const redeemUnits = isFull ? holding?.unitsHeld ?? 0 : parseFloat(units) || 0;
  const estimatedValue = holding?.currentNav ? redeemUnits * holding.currentNav : 0;

  async function handleRedeem() {
    if (!holding) return;
    if (!isFull && (redeemUnits <= 0 || redeemUnits > holding.unitsHeld)) {
      toast.error(`Enter units between 0.001 and ${holding.unitsHeld.toFixed(4)}`); return;
    }
    setSub(true);
    try {
      await api.post('/portfolio/redeem', {
        portfolioId,
        units: isFull ? undefined : redeemUnits,
        isFullRedemption: isFull,
      });
      setSuccess(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Redemption failed');
    } finally { setSub(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  if (success) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Redemption Placed!</h2>
      <p className="text-gray-600 mb-1">{holding?.fundName}</p>
      <p className="text-2xl font-bold text-sparrow-blue mb-1">{fmt(estimatedValue)}</p>
      <p className="text-sm text-gray-500 mb-6">Estimated proceeds · T+3 settlement</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/portfolio')} className="btn-primary flex-1">Back to Portfolio</button>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">Go Home</button>
      </div>
    </div>
  );

  if (!holding) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step === 'review' ? setStep('form') : navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Redeem Units</h1>
      </div>

      {/* Holding details */}
      <div className="card bg-blue-50 border-blue-100">
        <p className="font-semibold text-gray-900 text-sm">{holding.fundName}</p>
        <p className="text-xs text-gray-500 mb-2">{holding.fundHouse}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Units Held</p>
            <p className="text-sm font-bold text-gray-800">{holding.unitsHeld.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current NAV</p>
            <p className="text-sm font-bold text-gray-800">{holding.currentNav ? `₹${holding.currentNav.toFixed(4)}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current Value</p>
            <p className="text-sm font-bold text-sparrow-blue">{fmt(holding.currentValue)}</p>
          </div>
        </div>
      </div>

      {step === 'form' && (
        <>
          {/* Full / Partial toggle */}
          <div>
            <label className="field-label">Redemption Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFull(false)}
                className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors ${!isFull ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Partial
              </button>
              <button
                onClick={() => setIsFull(true)}
                className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors ${isFull ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Full Redemption
              </button>
            </div>
          </div>

          {!isFull && (
            <div>
              <label className="field-label">Units to Redeem</label>
              <input
                type="number"
                className="input-field"
                placeholder={`Max: ${holding.unitsHeld.toFixed(4)}`}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                step="0.001"
                max={holding.unitsHeld}
                min="0.001"
              />
              {parseFloat(units) > 0 && holding.currentNav && (
                <p className="text-sm text-sparrow-blue mt-1 font-medium">
                  Estimated: {fmt(parseFloat(units) * holding.currentNav)}
                </p>
              )}
            </div>
          )}

          {isFull && (
            <div className="card bg-red-50 border-red-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Full Redemption</p>
                <p className="text-xs text-red-600 mt-0.5">
                  All {holding.unitsHeld.toFixed(4)} units (~{fmt(holding.currentValue)}) will be redeemed.
                  This will close your position in this fund.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (!isFull && (redeemUnits <= 0 || redeemUnits > holding.unitsHeld)) {
                toast.error(`Enter valid units (max ${holding.unitsHeld.toFixed(4)})`); return;
              }
              setStep('review');
            }}
            className="btn-primary w-full"
          >
            Review Redemption →
          </button>
        </>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Confirm Redemption</h2>
          <div className="card space-y-3">
            <Row label="Fund"          value={holding.fundName} />
            <Row label="Units"         value={isFull ? `${holding.unitsHeld.toFixed(4)} (All)` : redeemUnits.toFixed(4)} />
            <Row label="Estimated NAV" value={holding.currentNav ? `₹${holding.currentNav.toFixed(4)}` : '—'} />
            <Row label="Est. Proceeds" value={fmt(estimatedValue)} highlight />
          </div>
          <div className="card bg-amber-50 border-amber-100">
            <p className="text-xs text-amber-800">
              Redemption is processed at closing NAV. Proceeds credited in T+3 business days. Exit load may apply.
            </p>
          </div>
          <button onClick={handleRedeem} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Processing…' : 'Confirm Redemption'}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-sparrow-blue' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
