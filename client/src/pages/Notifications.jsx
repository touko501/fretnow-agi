import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const TYPE_ICONS = { MISSION: '📦', BID: '💰', ALERT: '🚨' };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications()
      .then(d => setNotifications(d.notifications || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto fn-stagger">
        <div className="fn-skeleton h-8 w-48 mb-2 rounded-lg" />
        <div className="fn-skeleton h-4 w-32 mb-6 rounded-lg" />
        {[...Array(4)].map((_, i) => <div key={i} className="fn-skeleton h-20 rounded-2xl mb-3" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto fn-animate-in">
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Notifications</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>
          {unread.length} non lue{unread.length !== 1 ? 's' : ''}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="fn-card text-center py-20 fn-animate-scale">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'rgba(37,99,235,0.06)' }}>
            <span className="text-4xl">🔔</span>
          </div>
          <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune notification</p>
          <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Vous serez notifié ici des événements importants.</p>
        </div>
      ) : (
        <div className="space-y-2 fn-stagger">
          {[...unread, ...read].map(n => (
            <div key={n.id}
              className="fn-card p-4 flex items-start gap-3 transition-all duration-200"
              style={{
                opacity: n.read ? 0.6 : 1,
                borderLeft: n.read ? 'none' : '3px solid #3b82f6',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: n.read ? 'var(--fn-surface)' : 'rgba(37,99,235,0.06)' }}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{n.title || n.message}</p>
                {n.body && <p className="text-xs mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{n.body}</p>}
                <p className="text-[11px] mt-1" style={{ color: 'var(--fn-text-muted)' }}>
                  {n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR') : ''}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 shrink-0"
                  style={{ color: '#3b82f6', background: 'rgba(37,99,235,0.06)' }}
                  onMouseEnter={e => e.target.style.background = 'rgba(37,99,235,0.12)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(37,99,235,0.06)'}>
                  Marquer lu
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
