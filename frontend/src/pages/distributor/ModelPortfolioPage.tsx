import { useEffect, useState } from 'react';
import { Plus, Trash2, UserCheck, ToggleRight, ToggleLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { distributorService, ModelPortfolio } from '../../services/distributorService';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface FundOption { id: string; schemeName: string; fundHouse: string; category: string; }

export default function ModelPortfolioPage() {
  const [portfolios, setPortfolios] = useState<ModelPortfolio[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Create form state
  const [name, setName]             = useState('');
  const [desc, setDesc]             = useState('');
  const [fundSearch, setFundSearch] = useState('');
  const [fundResults, setFundResults] = useState<FundOption[]>([]);
  const [allocations, setAllocations] = useState<{ fund: FundOption; pct: number }[]>([]);
  const [creating, setCreating]     = useState(false);

  // Assign state
  const [assignMpId, setAssignMpId]   = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assigning, setAssigning]     = useState(false);

  useEffect(() => { loadPortfolios(); }, []);

  async function loadPortfolios() {
    try {
      setLoading(true);
      setPortfolios(await distributorService.listModelPortfolios());
    } catch { toast.error('Failed to load model portfolios'); }
    finally  { setLoading(false); }
  }

  // Fund search (debounce built-in via useEffect)
  useEffect(() => {
    if (!fundSearch.trim() || fundSearch.length < 2) { setFundResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/funds', { params: { q: fundSearch, limit: 8 } });
        setFundResults(data.funds ?? data ?? []);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [fundSearch]);

  function addFund(f: FundOption) {
    if (allocations.find((a) => a.fund.id === f.id)) return;
    setAllocations((prev) => [...prev, { fund: f, pct: 0 }]);
    setFundSearch('');
    setFundResults([]);
  }

  function removeFund(id: string) {
    setAllocations((prev) => prev.filter((a) => a.fund.id !== id));
  }

  const totalPct = allocations.reduce((s, a) => s + (a.pct || 0), 0);

  async function handleCreate() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (allocations.length === 0) { toast.error('Add at least one fund'); return; }
    if (Math.abs(totalPct - 100) > 0.01) { toast.error(`Allocations must sum to 100% (currently ${totalPct.toFixed(1)}%)`); return; }

    setCreating(true);
    try {
      await distributorService.createModelPortfolio({
        name,
        description: desc || undefined,
        funds: allocations.map((a) => ({ fundId: a.fund.id, allocationPct: a.pct })),
      });
      toast.success('Model portfolio created!');
      setName(''); setDesc(''); setAllocations([]); setShowCreate(false);
      await loadPortfolios();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Create failed');
    } finally { setCreating(false); }
  }

  async function toggleActive(mp: ModelPortfolio) {
    try {
      await distributorService.updateModelPortfolio(mp.id, { isActive: !mp.isActive });
      toast.success(mp.isActive ? 'Deactivated' : 'Activated');
      await loadPortfolios();
    } catch { toast.error('Update failed'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this model portfolio?')) return;
    try {
      await distributorService.deleteModelPortfolio(id);
      toast.success('Deleted');
      await loadPortfolios();
    } catch { toast.error('Delete failed'); }
  }

  async function handleAssign() {
    if (!assignMpId || !assignEmail.trim()) return;
    setAssigning(true);
    try {
      // Resolve userId from email via clients endpoint
      const res = await distributorService.listClients(assignEmail, 1, 5);
      const client = res.clients.find(
        (c) => c.email?.toLowerCase() === assignEmail.toLowerCase() || c.phone === assignEmail
      );
      if (!client) { toast.error('Client not found. Search by email or phone.'); setAssigning(false); return; }
      await distributorService.assignModelPortfolio(assignMpId, client.id);
      toast.success('Portfolio assigned to client!');
      setAssignMpId(null); setAssignEmail('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Assign failed');
    } finally { setAssigning(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Model Portfolios</h1>
          <p className="text-sm text-gray-500">{portfolios.length} portfolio templates</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2">
          <Plus className="w-4 h-4" /> New Portfolio
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card border border-sparrow-blue/20 space-y-4">
          <h2 className="font-semibold text-gray-800">Create Model Portfolio</h2>

          <div className="space-y-3">
            <div>
              <label className="label">Portfolio Name *</label>
              <input className="input" placeholder="e.g. Aggressive Growth" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={2} placeholder="Optional description..." value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>

          {/* Fund Search */}
          <div>
            <label className="label">Add Funds</label>
            <div className="relative">
              <input
                className="input"
                placeholder="Search fund by name..."
                value={fundSearch}
                onChange={(e) => setFundSearch(e.target.value)}
              />
              {fundResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                  {fundResults.map((f) => (
                    <button key={f.id} onClick={() => addFund(f)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-0 text-sm">
                      <p className="font-medium text-gray-800 truncate">{f.schemeName}</p>
                      <p className="text-xs text-gray-400">{f.fundHouse} · {f.category}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Allocations Table */}
          {allocations.length > 0 && (
            <div className="space-y-2">
              {allocations.map((a) => (
                <div key={a.fund.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.fund.schemeName}</p>
                    <p className="text-xs text-gray-400">{a.fund.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0} max={100} step={0.01}
                      value={a.pct || ''}
                      onChange={(e) => setAllocations((prev) =>
                        prev.map((x) => x.fund.id === a.fund.id ? { ...x, pct: parseFloat(e.target.value) || 0 } : x)
                      )}
                      className="w-16 text-center border rounded-lg px-2 py-1 text-sm"
                      placeholder="%"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <button onClick={() => removeFund(a.fund.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className={`text-right text-sm font-medium ${Math.abs(totalPct - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                Total: {totalPct.toFixed(1)}% {Math.abs(totalPct - 100) < 0.01 ? '✓' : '(must be 100%)'}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1 py-2.5 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Portfolio'}
            </button>
            <button onClick={() => { setShowCreate(false); setAllocations([]); setName(''); setDesc(''); }} className="btn-secondary flex-1 py-2.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Portfolio List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💼</p>
          <p className="font-medium">No model portfolios yet</p>
          <p className="text-sm mt-1">Create a template to assign to clients</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolios.map((mp) => (
            <div key={mp.id} className={`card border ${mp.isActive ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}>
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{mp.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${mp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {mp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {mp.description && <p className="text-xs text-gray-500 mt-0.5">{mp.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{mp.funds.length} funds · {mp._count.assignments} assigned</p>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => toggleActive(mp)} title="Toggle active" className="p-1.5 text-gray-400 hover:text-gray-700">
                    {mp.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setAssignMpId(mp.id)} title="Assign to client" className="p-1.5 text-gray-400 hover:text-sparrow-blue">
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(mp.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpanded((v) => v === mp.id ? null : mp.id)} className="p-1.5 text-gray-400">
                    {expanded === mp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded fund list */}
              {expanded === mp.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {mp.funds.map((f) => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <div>
                        <p className="text-gray-800 font-medium text-xs">{f.fund.schemeName}</p>
                        <p className="text-gray-400 text-[10px]">{f.fund.category}</p>
                      </div>
                      <span className="font-bold text-sparrow-blue text-sm">{f.allocationPct}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assign mini-form */}
              {assignMpId === mp.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm font-medium text-gray-700">Assign to Client</p>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Email or phone"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                    />
                    <button onClick={handleAssign} disabled={assigning} className="btn-primary text-sm px-3 py-2 disabled:opacity-50">
                      {assigning ? '...' : 'Assign'}
                    </button>
                    <button onClick={() => { setAssignMpId(null); setAssignEmail(''); }} className="btn-secondary text-sm px-3 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
