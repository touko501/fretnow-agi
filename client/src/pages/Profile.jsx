import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [f, setF] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api.updateProfile(f); await refreshUser(); setMsg('Profil mis à jour !'); }
    catch (e) { setMsg(e.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto fn-animate-in">
      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Mon profil</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>Gérez vos informations personnelles</p>
      </div>

      <div className="fn-card p-6 mb-4">
        {/* Avatar & info header */}
        <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 4px 15px rgba(37,99,235,0.25)' }}>
            <span className="text-xl font-bold text-white">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--fn-text)' }}>{user?.firstName} {user?.lastName}</div>
            <div className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>{user?.email}</div>
            <div className="flex gap-2 mt-1.5">
              <span className="fn-badge" style={{ background: 'rgba(37,99,235,0.08)', color: '#3b82f6' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                {user?.role}
              </span>
              {user?.isVerified && (
                <span className="fn-badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
                  Vérifié
                </span>
              )}
            </div>
          </div>
        </div>

        {msg && (
          <div className="fn-animate-in mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: msg.includes('!') ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              color: msg.includes('!') ? '#10b981' : '#ef4444',
              border: msg.includes('!') ? '1px solid rgba(16,185,129,0.1)' : '1px solid rgba(239,68,68,0.1)',
            }}>
            {msg.includes('!') ? '✅' : '⚠️'} {msg}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fn-text-muted)' }}>Prénom</label>
              <input value={f.firstName} onChange={e => u('firstName', e.target.value)} className="fn-input w-full" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fn-text-muted)' }}>Nom</label>
              <input value={f.lastName} onChange={e => u('lastName', e.target.value)} className="fn-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fn-text-muted)' }}>Téléphone</label>
            <input value={f.phone} onChange={e => u('phone', e.target.value)} className="fn-input w-full" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fn-text-muted)' }}>Email</label>
            <input value={user?.email || ''} disabled className="fn-input w-full opacity-50" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="fn-btn fn-btn-primary mt-6">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Enregistrement...
            </span>
          ) : 'Enregistrer'}
        </button>
      </div>

      {user?.company && (
        <div className="fn-card p-6">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>Entreprise</h2>
          <div className="space-y-3">
            {[
              { label: 'Raison sociale', value: user.company.name },
              { label: 'SIREN', value: user.company.siren },
              { label: 'Type', value: user.company.type },
              { label: 'Vérifié', value: user.company.isVerified ? '✅ Oui' : '⏳ En attente', color: user.company.isVerified ? '#10b981' : '#f59e0b' },
              user.company.mobilicEnabled && { label: 'Mobilic', value: '✅ Connecté', color: '#10b981' },
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                <span className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>{item.label}</span>
                <span className="text-sm font-semibold" style={{ color: item.color || 'var(--fn-text)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
