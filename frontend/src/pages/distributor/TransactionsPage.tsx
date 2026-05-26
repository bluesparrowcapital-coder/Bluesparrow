import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { DollarSign, RefreshCw, PauseCircle, TrendingDown, ArrowLeftRight, PlayCircle } from 'lucide-react';
import { distributorService, DistributorClient } from '../../services/distributorService';
import { fundService, Fund } from '../../services/fundService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import type { RootState } from '../../store';

type Tab = 'lumpsum' | 'sip_start' | 'sip_manage' | 'redemption' | 'stp_swp';

const FREQUENCIES = ['MONTHLY', 'WEEKLY', 'QUARTERLY'];
const SIP_DATES   = Array.from({ length: 28 }, (_, i) => i + 1);

function ClientSelector({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [clients, setClients] = useState<DistributorClient[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    distributorService.listClients(q, 1, 20).then(r => setClients(r.clients)).catch(() => {});
  }, [q]);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Client</label>
      <input
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
        placeholder="Search client…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <select
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
        value={value}
        onChange={e => {
          const c = clients.find(x => x.id === e.target.value);
          onChange(e.target.value, c?.fullName ?? '');
        }}
      >
        <option value="">— Choose client —</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>
            {c.fullName} ({c.phone}) — KYC: {c.kycStatus}
          </option>
        ))}
      </select>
    </div>
  );
}

function FundSelector({ value, onChange }: { value: string; onChange: (f: Fund) => void }) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (q.length < 2) { setFunds([]); return; }
    fundService.list({ search: q, limit: 10, page: 1 }).then((r: { funds: Fund[] }) => setFunds(r.funds)).catch(() => {});
  }, [q]);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Fund</label>
      <input
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
        placeholder="Type fund name to search…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {funds.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {funds.map(f => (
            <button
              key={f.id}
              onClick={() => { onChange(f); setQ(f.schemeName); setFunds([]); }}
              className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 last:border-0 hover:bg-blue-50 transition ${
                value === f.id ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-800'
              }`}
            >
              <span className="font-medium">{f.schemeName}</span>
              <span className="text-xs text-gray-500 ml-2">{f.category} · NAV: ₹{f.nav?.toFixed(2) ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
      <span>ℹ️</span><span>{text}</span>
    </div>
  );
}

// ─── LUMPSUM ──────────────────────────────────────────────────────────────
function LumpsumTab() {
  const [clientId,   setClientId]   = useState('');
  const [clientName, setClientName] = useState('');
  const [fund,       setFund]       = useState<Fund | null>(null);
  const [amount,     setAmount]     = useState('');
  const [loading,    setLoading]    = useState(false);

  async function submit() {
    if (!clientId || !fund || !amount) return toast.error('Fill all fields');
    const amt = Number(amount);
    if (isNaN(amt) || amt < fund.minLumpsum)
      return toast.error(`Min lumpsum is ₹${fund.minLumpsum}`);
    setLoading(true);
    try {
      await api.post('/portfolio/invest', { fundId: fund.id, amount: amt, type: 'LUMPSUM' });
      toast.success(`Lumpsum of ₹${amt.toLocaleString('en-IN')} placed for ${clientName}`);
      setAmount(''); setClientId(''); setClientName(''); setFund(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Transaction failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <InfoNote text="Lumpsum purchase will be placed on behalf of the selected client. Client must have verified KYC." />
      <ClientSelector value={clientId} onChange={(id, name) => { setClientId(id); setClientName(name); }} />
      <FundSelector value={fund?.id ?? ''} onChange={setFund} />
      {fund && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between"><span>Min Lumpsum</span><span className="font-semibold">₹{fund.minLumpsum.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Current NAV</span><span className="font-semibold">{fund.nav ? `₹${fund.nav.toFixed(4)}` : '—'}</span></div>
          <div className="flex justify-between"><span>Expense Ratio</span><span className="font-semibold">{fund.expenseRatio ? `${fund.expenseRatio}%` : '—'}</span></div>
          <div className="flex justify-between"><span>Exit Load</span><span className="font-semibold">{fund.exitLoad ?? 'Nil'}</span></div>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
        <input
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
          type="number" placeholder="Enter amount" value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        {fund && amount && Number(amount) >= fund.minLumpsum && (
          <p className="text-xs text-gray-500 mt-1">
            ≈ {fund.nav ? (Number(amount) / fund.nav).toFixed(3) : '—'} units at NAV ₹{fund.nav?.toFixed(4)}
          </p>
        )}
      </div>
      <button
        onClick={submit} disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white font-semibold rounded-xl text-sm disabled:opacity-60 shadow-md hover:opacity-90 transition"
      >
        {loading ? 'Processing…' : '💰 Place Lumpsum Order'}
      </button>
    </div>
  );
}

// ─── SIP START ────────────────────────────────────────────────────────────
function SipStartTab() {
  const [clientId, setClientId]   = useState('');
  const [clientName, setClientName] = useState('');
  const [fund,    setFund]        = useState<Fund | null>(null);
  const [amount,  setAmount]      = useState('');
  const [freq,    setFreq]        = useState('MONTHLY');
  const [sipDate, setSipDate]     = useState(1);
  const [loading, setLoading]     = useState(false);

  async function submit() {
    if (!clientId || !fund || !amount) return toast.error('Fill all fields');
    const amt = Number(amount);
    if (isNaN(amt) || amt < fund.minSipAmount) return toast.error(`Min SIP is ₹${fund.minSipAmount}`);
    setLoading(true);
    try {
      await api.post('/sip', { fundId: fund.id, amount: amt, frequency: freq, sipDate, installments: 0 });
      toast.success(`SIP started for ${clientName}!`);
      setAmount(''); setClientId(''); setClientName(''); setFund(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to start SIP');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <InfoNote text="SIP will be registered for the selected client. Ensure bank mandate is active." />
      <ClientSelector value={clientId} onChange={(id, name) => { setClientId(id); setClientName(name); }} />
      <FundSelector value={fund?.id ?? ''} onChange={setFund} />
      {fund && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between"><span>Min SIP</span><span className="font-semibold">₹{fund.minSipAmount}</span></div>
          <div className="flex justify-between"><span>Current NAV</span><span className="font-semibold">{fund.nav ? `₹${fund.nav.toFixed(4)}` : '—'}</span></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
          <input
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
            type="number" placeholder="SIP amount" value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SIP Date</label>
          <select
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
            value={sipDate} onChange={e => setSipDate(Number(e.target.value))}
          >
            {SIP_DATES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frequency</label>
        <div className="flex gap-2">
          {FREQUENCIES.map(f => (
            <button
              key={f}
              onClick={() => setFreq(f)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                freq === f ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600'
              }`}
            >{f}</button>
          ))}
        </div>
      </div>
      <button
        onClick={submit} disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white font-semibold rounded-xl text-sm disabled:opacity-60 shadow-md hover:opacity-90 transition"
      >
        {loading ? 'Registering…' : '📅 Start SIP'}
      </button>
    </div>
  );
}

// ─── SIP MANAGE (Modify / Pause / Resume / Cancel) ────────────────────────
function SipManageTab() {
  const [clientId,   setClientId]   = useState('');
  const [clientName, setClientName] = useState('');
  const [sips,       setSips]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);

  async function loadSips(cId: string) {
    if (!cId) return;
    setLoading(true);
    try {
      const detail = await distributorService.getClientDetail(cId);
      setSips(detail.sips);
    } catch { toast.error('Failed to load SIPs'); }
    finally  { setLoading(false); }
  }

  async function toggleSip(sipId: string, action: 'pause' | 'resume' | 'cancel') {
    try {
      if (action === 'pause')  await api.patch(`/sip/${sipId}/pause`);
      if (action === 'resume') await api.patch(`/sip/${sipId}/resume`);
      if (action === 'cancel') await api.delete(`/sip/${sipId}`);
      toast.success(`SIP ${action}d`);
      loadSips(clientId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed');
    }
  }

  const STATUS_CLS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700', PAUSED: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-gray-100 text-gray-500', COMPLETED: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="max-w-lg">
        <ClientSelector
          value={clientId}
          onChange={(id, name) => { setClientId(id); setClientName(name); loadSips(id); }}
        />
      </div>
      {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-sparrow-blue" /></div>}
      {!loading && sips.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">{clientName}'s SIPs</p>
          {sips.map(sip => (
            <div key={sip.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{sip.fund?.schemeName}</p>
                <p className="text-xs text-gray-500">₹{sip.amount.toLocaleString()} · {sip.frequency} · Date {sip.sipDate}</p>
                <p className="text-xs text-gray-400">{sip.installmentsDone} installments done</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[sip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {sip.status}
              </span>
              <div className="flex gap-1.5 shrink-0">
                {sip.status === 'ACTIVE' && (
                  <button onClick={() => toggleSip(sip.id, 'pause')} title="Pause"
                    className="p-1.5 rounded-lg border border-yellow-200 text-yellow-600 hover:bg-yellow-50 transition">
                    <PauseCircle className="w-4 h-4" />
                  </button>
                )}
                {sip.status === 'PAUSED' && (
                  <button onClick={() => toggleSip(sip.id, 'resume')} title="Resume"
                    className="p-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition">
                    <PlayCircle className="w-4 h-4" />
                  </button>
                )}
                {['ACTIVE', 'PAUSED'].includes(sip.status) && (
                  <button onClick={() => { if (confirm('Cancel this SIP?')) toggleSip(sip.id, 'cancel'); }} title="Cancel"
                    className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && clientId && sips.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No SIPs found for this client</p>
      )}
    </div>
  );
}

// ─── REDEMPTION ───────────────────────────────────────────────────────────
function RedemptionTab() {
  const [clientId,   setClientId]   = useState('');
  const [clientName, setClientName] = useState('');
  const [holdings,   setHoldings]   = useState<any[]>([]);
  const [selected,   setSelected]   = useState('');
  const [redeemAll,  setRedeemAll]  = useState(false);
  const [amount,     setAmount]     = useState('');
  const [loading,    setLoading]    = useState(false);

  async function loadHoldings(cId: string) {
    if (!cId) return;
    setLoading(true);
    try {
      const detail = await distributorService.getClientDetail(cId);
      setHoldings(detail.portfolios.filter(p => p.unitsHeld > 0));
    } catch { toast.error('Failed to load holdings'); }
    finally  { setLoading(false); }
  }

  async function submit() {
    if (!clientId || !selected) return toast.error('Select client and holding');
    const h = holdings.find(x => x.id === selected);
    if (!h) return;
    setLoading(true);
    try {
      await api.post('/portfolio/redeem', {
        portfolioId: h.id,
        amount: redeemAll ? h.currentValue : Number(amount),
        redeemAll,
      });
      toast.success('Redemption request placed');
      setAmount(''); setSelected(''); loadHoldings(clientId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Redemption failed');
    } finally { setLoading(false); }
  }

  const selectedHolding = holdings.find(x => x.id === selected);

  return (
    <div className="space-y-4 max-w-lg">
      <InfoNote text="Redemption request will be placed on behalf of the client. Units will be redeemed at applicable NAV." />
      <ClientSelector
        value={clientId}
        onChange={(id, name) => { setClientId(id); setClientName(name); loadHoldings(id); setSelected(''); }}
      />
      {holdings.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Holding</label>
          <select
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
            value={selected} onChange={e => setSelected(e.target.value)}
          >
            <option value="">— Select fund to redeem —</option>
            {holdings.map(h => (
              <option key={h.id} value={h.id}>
                {h.fund.schemeName} — {h.unitsHeld.toFixed(3)} units · ₹{h.currentValue.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedHolding && (
        <>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
            <div className="flex justify-between"><span>Units Held</span><span className="font-semibold">{selectedHolding.unitsHeld.toFixed(3)}</span></div>
            <div className="flex justify-between"><span>Current Value</span><span className="font-semibold">₹{selectedHolding.currentValue.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Invested</span><span className="font-semibold">₹{selectedHolding.investedAmount.toLocaleString('en-IN')}</span></div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={redeemAll} onChange={e => setRedeemAll(e.target.checked)} className="rounded" />
            Redeem all units (full redemption)
          </label>
          {!redeemAll && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
                type="number" placeholder="Amount to redeem" value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={submit} disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl text-sm disabled:opacity-60 shadow-md hover:opacity-90 transition"
          >
            {loading ? 'Placing…' : '💸 Place Redemption'}
          </button>
        </>
      )}
      {clientId && !loading && holdings.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No holdings to redeem</p>
      )}
    </div>
  );
}

// ─── STP / SWP ─────────────────────────────────────────────────────────────
function StpSwpTab() {
  const [type, setType] = useState<'STP' | 'SWP'>('STP');
  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex gap-2">
        {(['STP', 'SWP'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm border transition ${
              type === t ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600'
            }`}
          >
            {t === 'STP' ? '🔄 STP (Transfer)' : '📤 SWP (Withdrawal)'}
          </button>
        ))}
      </div>
      <div className="card bg-blue-50 border-blue-100">
        <p className="text-sm font-semibold text-blue-800 mb-1">
          {type === 'STP' ? 'Systematic Transfer Plan' : 'Systematic Withdrawal Plan'}
        </p>
        <p className="text-xs text-blue-600">
          {type === 'STP'
            ? 'Transfer a fixed amount from one fund to another at regular intervals.'
            : 'Withdraw a fixed amount from a fund at regular intervals.'}
        </p>
      </div>
      <InfoNote text={`${type} feature requires BSE/NSE integration. Contact support to enable.`} />
      <ClientSelector value="" onChange={() => {}} />
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {type === 'STP' ? 'Source Fund' : 'Fund'}
        </label>
        <FundSelector value="" onChange={() => {}} />
      </div>
      {type === 'STP' && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Target Fund</label>
          <FundSelector value="" onChange={() => {}} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
          <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" type="number" placeholder="Monthly amount" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frequency</label>
          <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl text-sm shadow-md hover:opacity-90 transition">
        🔄 Register {type}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [tab, setTab] = useState<Tab>('lumpsum');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'lumpsum',    label: 'Lumpsum',    icon: <DollarSign   className="w-3.5 h-3.5" /> },
    { id: 'sip_start',  label: 'SIP Start',  icon: <PlayCircle   className="w-3.5 h-3.5" /> },
    { id: 'sip_manage', label: 'SIP Manage', icon: <RefreshCw    className="w-3.5 h-3.5" /> },
    { id: 'redemption', label: 'Redemption', icon: <TrendingDown className="w-3.5 h-3.5" /> },
    { id: 'stp_swp',    label: 'STP / SWP',  icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-500">Place purchases, SIPs, and redemptions for clients</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-white shadow text-sparrow-blue' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'lumpsum'    && <LumpsumTab />}
      {tab === 'sip_start'  && <SipStartTab />}
      {tab === 'sip_manage' && <SipManageTab />}
      {tab === 'redemption' && <RedemptionTab />}
      {tab === 'stp_swp'    && <StpSwpTab />}
    </div>
  );
}
