import { useEffect, useState } from 'react';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { distributorService, AuditLog } from '../../services/distributorService';
import toast from 'react-hot-toast';

export default function CompliancePage() {
  const [logs, setLogs]   = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoad] = useState(true);
  const LIMIT = 50;

  useEffect(() => { load(page); }, [page]);  // eslint-disable-line

  async function load(p: number) {
    setLoad(true);
    try {
      const res = await distributorService.getAuditLogs(p, LIMIT);
      setLogs(res.logs);
      setTotal(res.total);
    } catch { toast.error('Failed to load audit logs'); }
    finally  { setLoad(false); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  const ACTION_COLORS: Record<string, string> = {
    DASHBOARD_VIEW: 'bg-blue-100 text-blue-700',
    CLIENT_VIEW:    'bg-purple-100 text-purple-700',
    MODEL_PORTFOLIO_CREATED: 'bg-green-100 text-green-700',
    MODEL_PORTFOLIO_DELETED: 'bg-red-100 text-red-600',
    MODEL_PORTFOLIO_ASSIGNED: 'bg-orange-100 text-orange-700',
    DEFAULT: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Compliance & Audit Trail</h1>
          <p className="text-sm text-gray-500">{total} total activity records</p>
        </div>
        <Shield className="w-6 h-6 text-sparrow-blue" />
      </div>

      {/* Info card */}
      <div className="card bg-blue-50 border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>ARN Compliance:</strong> All client-facing actions are automatically logged for regulatory compliance. Audit logs are immutable and retained for 5 years.
        </p>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No audit logs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const color = ACTION_COLORS[log.action] ?? ACTION_COLORS.DEFAULT;
            return (
              <div key={log.id} className="card flex items-start gap-3">
                <div className="mt-0.5">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${color}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{log.entityType}</span>
                    {log.entityId && <span className="text-gray-400"> · {log.entityId.slice(0, 8)}…</span>}
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                    {log.ipAddress && ` · ${log.ipAddress}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
