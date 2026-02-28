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

  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon profil</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-700">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{user?.firstName} {user?.lastName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{user?.role}</span>
              {user?.isVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Vérifié</span>}
            </div>
          </div>
        </div>

        {msg && <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('!') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label><input value={f.firstName} onChange={e => u('firstName', e.target.value)} className={inp} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input value={f.lastName} onChange={e => u('lastName', e.target.value)} className={inp} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label><input value={f.phone} onChange={e => u('phone', e.target.value)} className={inp} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={user?.email || ''} disabled className={inp + " bg-gray-50 text-gray-500"} /></div>
        </div>
        <button onClick={save} disabled={saving} className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>

      {user?.company && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Entreprise</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Raison sociale</span><span className="font-medium">{user.company.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">SIREN</span><span className="font-medium">{user.company.siren}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{user.company.type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vérifié</span><span className={user.company.isVerified ? 'text-green-600 font-medium' : 'text-orange-600'}>{user.company.isVerified ? '✅ Oui' : '⏳ En attente'}</span></div>
            {user.company.mobilicEnabled && <div className="flex justify-between"><span className="text-gray-500">Mobilic</span><span className="text-green-600 font-medium">✅ Connecté</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
