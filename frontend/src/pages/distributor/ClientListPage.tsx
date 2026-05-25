import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Users, TrendingUp } from 'lucide-react';
import { distributorService, DistributorClient } from '../../services/distributorService';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

const KYC_BADGE: Record<string, string> = {
  VERIFIED:  'bg-green-100 text-green-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  PENDING:   'bg-gray-100 text-gray-600',
  REJECTED:  'bg-red-100 text-red-600',
};

export default function ClientListPage() {
  const [clients, setClients] = useState<DistributorClient[]>([]);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoad]    = useState(true);
  const navigate               = useNavigate();
  const LIMIT = 20;

  const load = useCallback(async (q: string, p: number) => {
    setLoad(true);
    try {
      const res = await distributorService.listClients(q || undefined, p, LIMIT);
      setClients(res.clients);
      setTotal(res.total);
    } catch { toast.error('Failed to load clients'); }
    finally  { setLoad(false); }
  }, []);

  useEffect(() => { load(search, page); }, [page]);  // eslint-disable-line

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(search, 1); }, 400);
    return () => clearTimeout(t);
  }, [search]);  // eslint-disable-line

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Client Management</h1>
          <p className="text-sm text-gray-500">{total} total clients</p>
        </div>
        <div className="flex items-center gap-2 text-sparrow-blue">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, PAN, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 w-full"
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No clients found</p>
          <p className="text-sm mt-1">Clients who invest through you will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const retPct = c.invested > 0 ? ((c.aum - c.invested) / c.invested) * 100 : 0;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/distributor/clients/${c.id}`)}
                className="card w-full text-left hover:shadow-md transition-all flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-sparrow-blue text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {c.fullName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{c.fullName}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${KYC_BADGE[c.kycStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {c.kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.phone} • {c.panNumber ?? 'PAN pending'}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-gray-600">AUM: <strong>{fmt(c.aum)}</strong></span>
                    <span className={`text-xs ${retPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <TrendingUp className="w-3 h-3 inline mr-0.5" />
                      {retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
