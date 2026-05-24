import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationService, Notification } from '../services/phase3Service';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TYPE_STYLE: Record<string, string> = {
  SIP:      'bg-blue-100 text-blue-700',
  GOAL:     'bg-purple-100 text-purple-700',
  TXN:      'bg-green-100 text-green-700',
  SYSTEM:   'bg-gray-100 text-gray-600',
  default:  'bg-gray-100 text-gray-600',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);

  useEffect(() => { load(1, true); }, []);

  async function load(p: number, reset = false) {
    try {
      const { notifications: data, unread: u, pagination } = await notificationService.list(p, 20);
      setNotifications((prev) => reset ? data : [...prev, ...data]);
      setUnread(u);
      setPage(p);
      setHasMore(p < pagination.pages);
    } catch { toast.error('Failed to load notifications'); }
    finally  { setLoading(false); }
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      setUnread((u) => Math.max(0, u - 1));
    } catch { toast.error('Failed to mark read'); }
  }

  async function handleMarkAll() {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnread(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed to mark all read'); }
  }

  async function handleDelete(id: string) {
    try {
      await notificationService.delete(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) setUnread((u) => Math.max(0, u - 1));
    } catch { toast.error('Failed to delete notification'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-sparrow-blue">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1 text-sm text-sparrow-blue hover:underline font-medium"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold mb-1">No notifications</p>
          <p className="text-sm text-gray-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card transition-colors ${!n.isRead ? 'bg-blue-50 border-blue-100' : ''}`}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              style={{ cursor: n.isRead ? 'default' : 'pointer' }}
            >
              <div className="flex items-start gap-3">
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0">
                  {!n.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-sparrow-blue" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[n.type] ?? TYPE_STYLE.default}`}>
                      {n.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => load(page + 1)}
          className="w-full py-2.5 text-sm text-sparrow-blue hover:bg-blue-50 rounded-xl border border-blue-100 transition-colors font-medium"
        >
          Load more
        </button>
      )}
    </div>
  );
}
