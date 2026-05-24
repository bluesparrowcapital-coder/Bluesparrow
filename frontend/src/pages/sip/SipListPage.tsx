import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, X, ChevronRight, CalendarDays, TrendingUp } from 'lucide-react';
import { sipService, Sip } from '../../services/phase3Service';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  PAUSED:    'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

export default function SipListPage() {
  const [sips, setSips]       = useState<Sip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED'>('ALL');
  const navigate               = useNavigate();

  useEffect(() => { loadSips(); }, []);

  async function loadSips() {
    try {
      const data = await sipService.list();
      setSips(data);
    } catch { toast.error('Failed to load SIPs'); }
    finally  { setLoading(false); }
  }

  async function handleAction(sip: Sip, action: 'pause' | 'resume' | 'cancel') {
    const labels = { pause: 'Pausing', resume: 'Resuming', cancel: 'Cancelling' };
    const tid = toast.loading(`${labels[action]} SIP…`);
    try {
      let updated: Sip;
      if (action === 'pause')  updated = await sipService.pause(sip.id);
      else if (action === 'resume') updated = await sipService.resume(sip.id);
      else updated = await sipService.cancel(sip.id);

      setSips((prev) => prev.map((s) => (s.id === sip.id ? updated : s)));
      toast.success(`SIP ${action}d`, { id: tid });
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Action failed', { id: tid });
    }
  }

  const filtered = sips.filter((s) => filter === 'ALL' || s.status === filter);
  const totalMonthly = sips.filter((s) => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0);
  const totalInvested = sips.reduce((a, s) => a + s.totalInvested, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My SIPs</h1>
          <p className="text-sm text-gray-500">{sips.filter((s) => s.status === 'ACTIVE').length} active</p>
        </div>
        <button onClick={() => navigate('/sip/create')} className="btn-primary flex items-center gap-1 text-sm px-3 py-2">
          <Plus className="w-4 h-4" /> New SIP
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Monthly SIP</p>
          <p className="text-lg font-bold text-sparrow-blue">{fmt(totalMonthly)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">Total Invested</p>
          <p className="text-lg font-bold text-gray-800">{fmt(totalInvested)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(['ALL', 'ACTIVE', 'PAUSED', 'CANCELLED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f ? 'bg-sparrow-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'ALL' ? `All (${sips.length})` : `${f} (${sips.filter((s) => s.status === f).length})`}
          </button>
        ))}
      </div>

      {/* SIP list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No SIPs found</p>
          <button onClick={() => navigate('/sip/create')} className="btn-primary text-sm">
            Start Your First SIP
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sip) => (
            <div key={sip.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                    {sip.fund.schemeName}
                  </p>
                  <p className="text-xs text-gray-500">{sip.fund.fundHouse}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[sip.status]}`}>
                  {sip.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm font-bold text-sparrow-blue">{fmt(sip.amount)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Invested</p>
                  <p className="text-sm font-semibold text-gray-800">{fmt(sip.totalInvested)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Installments</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {sip.installmentsDone}{sip.totalInstallments ? `/${sip.totalInstallments}` : ''}
                  </p>
                </div>
              </div>

              {sip.nextDateFormatted && (
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Next: {new Date(sip.nextDateFormatted).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}

              <div className="flex items-center gap-2 border-t pt-3">
                {sip.status === 'ACTIVE' && (
                  <button onClick={() => handleAction(sip, 'pause')} className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium">
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                {sip.status === 'PAUSED' && (
                  <button onClick={() => handleAction(sip, 'resume')} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                {(sip.status === 'ACTIVE' || sip.status === 'PAUSED') && (
                  <button onClick={() => handleAction(sip, 'cancel')} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
                <button
                  onClick={() => navigate(`/explore/${sip.fundId}`)}
                  className="ml-auto flex items-center gap-1 text-xs text-sparrow-blue hover:underline font-medium"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Fund Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
