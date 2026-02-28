import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-500 text-sm mb-6">{unread.length} non lue{unread.length !== 1 ? 's' : ''}</p>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune notification</h3>
          <p className="text-gray-500 text-sm">Vous serez notifié ici des événements importants.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...unread, ...read].map(n => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition ${n.read ? 'border-gray-200 opacity-70' : 'border-blue-200 bg-blue-50/30'}`}>
              <div className="text-xl mt-0.5">{n.type === 'MISSION' ? '📦' : n.type === 'BID' ? '💰' : n.type === 'ALERT' ? '🚨' : '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{n.title || n.message}</div>
                {n.body && <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>}
                <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR') : ''}</div>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:underline shrink-0">Lu</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
