import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, RefreshCw, Target, Wallet, CreditCard } from 'lucide-react';
import { distributorService, ClientDetail } from '../../services/distributorService';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

type Tab = 'portfolio' | 'sip' | 'txn' | 'goals';

const KYC_BADGE: Record<string, string> = {
  VERIFIED:  'bg-green-100 text-green-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  PENDING:   'bg-gray-100 text-gray-600',
  REJECTED:  'bg-red-100 text-red-600',
};

const STATUS_BADGE: Record<string, string> = {
  SUCCESS:   'bg-green-100 text-green-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-600',
  ACTIVE:    'bg-green-100 text-green-700',
  PAUSED:    'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

export default function ClientDetailPage() {
  const { clientId }  = useParams<{ clientId: string }>();
  const navigate       = useNavigate();
  const [data, setData] = useState<ClientDetail | null>(null);
  const [tab,  setTab]  = useState<Tab>('portfolio');
  const [load, setLoad] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    distributorService.getClientDetail(clientId)
      .then(setData)
      .catch(() => { toast.error('Failed to load client'); navigate(-1); })
      .finally(() => setLoad(false));
  }, [clientId]);

  if (load) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );
  if (!data) return null;

  const { user, portfolios, sips, transactions, goals, summary } = data;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </button>

      {/* Client Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-sparrow-blue text-white flex items-center justify-center font-bold text-lg">
            {user.fullName?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{user.fullName}</h1>
            <p className="text-sm text-gray-500">{user.phone} · {user.email}</p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${KYC_BADGE[user.kycStatus] ?? 'bg-gray-100 text-gray-500'}`}>
            {user.kycStatus}
          </span>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Current AUM',    value: fmt(summary.totalAUM),     icon: <Wallet className="w-4 h-4 text-sparrow-blue" /> },
            { label: 'Invested',       value: fmt(summary.totalInvested), icon: <CreditCard className="w-4 h-4 text-gray-500" /> },
            { label: 'Returns',        value: `${summary.returnPct >= 0 ? '+' : ''}${summary.returnPct.toFixed(2)}%`, icon: <TrendingUp className={`w-4 h-4 ${summary.returnPct >= 0 ? 'text-green-600' : 'text-red-500'}`} /> },
            { label: 'Active SIPs',    value: summary.activeSips.toString(), icon: <RefreshCw className="w-4 h-4 text-orange-500" /> },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              {s.icon}
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="font-bold text-gray-900 text-sm">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['portfolio', 'sip', 'txn', 'goals'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-sparrow-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {{ portfolio: 'Portfolio', sip: 'SIPs', txn: 'Transactions', goals: 'Goals' }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Portfolio */}
      {tab === 'portfolio' && (
        <div className="space-y-3">
          {portfolios.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">No holdings yet</div>
          ) : portfolios.map((p) => {
            const ret = p.investedAmount > 0 ? ((p.currentValue - p.investedAmount) / p.investedAmount) * 100 : 0;
            return (
              <div key={p.id} className="card">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-gray-900 text-sm leading-tight flex-1 mr-2">{p.fund.schemeName}</p>
                  <span className={`text-xs font-semibold ${ret >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{p.fund.fundHouse} · {p.fund.category}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Invested: <strong>{fmt(p.investedAmount)}</strong></span>
                  <span className="text-gray-800">Current: <strong>{fmt(p.currentValue)}</strong></span>
                </div>
                {p.folioNumber && <p className="text-[10px] text-gray-400 mt-1">Folio: {p.folioNumber}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: SIPs */}
      {tab === 'sip' && (
        <div className="space-y-3">
          {sips.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">No SIPs found</div>
          ) : sips.map((s) => (
            <div key={s.id} className="card">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm text-gray-900 flex-1 mr-2">{s.fund.schemeName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {s.status}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>₹{s.amount.toLocaleString('en-IN')} / {s.frequency}</span>
                <span>Date: {s.sipDate}</span>
                <span>{s.installmentsDone} paid</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Transactions */}
      {tab === 'txn' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">No transactions found</div>
          ) : transactions.map((t) => (
            <div key={t.id} className="card flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.type === 'REDEMPTION' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {t.type === 'REDEMPTION' ? '↓' : '↑'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{t.fund.schemeName}</p>
                <p className="text-xs text-gray-400">{new Date(t.txnDate).toLocaleDateString('en-IN')} · {t.type}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold text-sm ${t.type === 'REDEMPTION' ? 'text-red-600' : 'text-green-600'}`}>
                  {t.type === 'REDEMPTION' ? '-' : '+'}{fmt(t.amount)}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_BADGE[t.status] ?? ''}`}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Goals */}
      {tab === 'goals' && (
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="card text-center text-gray-400 py-10">No goals set by client</div>
          ) : goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            return (
              <div key={g.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-sparrow-blue" />
                    <p className="font-medium text-gray-900 text-sm">{g.goalName}</p>
                  </div>
                  {g.isCompleted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Progress: {fmt(g.currentAmount)}</span>
                  <span>Target: {fmt(g.targetAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-sparrow-blue h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-right mt-1 text-gray-400">{pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
