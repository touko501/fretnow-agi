import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const TYPE_ICONS = {
  FOURGON_3T5: '🚐', FOURGON_20M3: '🚐', PORTEUR_7T5: '🚚', PORTEUR_19T: '🚚',
  SEMI_TAUTLINER: '🚛', SEMI_FRIGO: '❄️', SEMI_BACHE: '🚛',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ type: 'FOURGON_20M3', plate: '', brand: '', model: '', maxWeightKg: '', maxVolumeM3: '' });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.getVehicles().then(d => setVehicles(d.vehicles || d || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const add = async () => {
    try {
      await api.createVehicle({ ...f, maxWeightKg: f.maxWeightKg ? parseFloat(f.maxWeightKg) : undefined, maxVolumeM3: f.maxVolumeM3 ? parseFloat(f.maxVolumeM3) : undefined });
      const v = await api.getVehicles();
      setVehicles(v.vehicles || v || []);
      setShowForm(false);
      setF({ type: 'FOURGON_20M3', plate: '', brand: '', model: '', maxWeightKg: '', maxVolumeM3: '' });
    } catch (e) { alert(e.message); }
  };

  const types = ['FOURGON_3T5', 'FOURGON_20M3', 'PORTEUR_7T5', 'PORTEUR_19T', 'SEMI_TAUTLINER', 'SEMI_FRIGO', 'SEMI_BACHE'];

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="flex items-center justify-between mb-6">
          <div><div className="fn-skeleton h-8 w-32 mb-2 rounded-lg" /><div className="fn-skeleton h-4 w-24 rounded-lg" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="fn-skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fn-animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Ma flotte</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fn-text-secondary)' }}>
            {vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''} enregistré{vehicles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="fn-btn fn-btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Ajouter
        </button>
      </div>

      {showForm && (
        <div className="fn-card p-6 mb-6 fn-animate-in">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>Nouveau véhicule</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <select value={f.type} onChange={e => u('type', e.target.value)} className="fn-input">
              {types.map(t => <option key={t} value={t}>{(TYPE_ICONS[t] || '🚛') + ' ' + t.replace(/_/g, ' ')}</option>)}
            </select>
            <input value={f.plate} onChange={e => u('plate', e.target.value)} placeholder="Immatriculation" className="fn-input" />
            <input value={f.brand} onChange={e => u('brand', e.target.value)} placeholder="Marque" className="fn-input" />
            <input value={f.model} onChange={e => u('model', e.target.value)} placeholder="Modèle" className="fn-input" />
            <input type="number" value={f.maxWeightKg} onChange={e => u('maxWeightKg', e.target.value)} placeholder="Charge max (kg)" className="fn-input" />
            <input type="number" value={f.maxVolumeM3} onChange={e => u('maxVolumeM3', e.target.value)} placeholder="Volume max (m³)" className="fn-input" />
          </div>
          <button onClick={add}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
            Enregistrer
          </button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="fn-card text-center py-20 fn-animate-scale">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'rgba(37,99,235,0.06)' }}>
            <span className="text-4xl">🚐</span>
          </div>
          <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Aucun véhicule</p>
          <p className="text-sm mb-5" style={{ color: 'var(--fn-text-muted)' }}>Ajoutez votre premier véhicule pour commencer à répondre aux missions.</p>
          <button onClick={() => setShowForm(true)} className="fn-btn fn-btn-primary">Ajouter un véhicule</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 fn-stagger">
          {vehicles.map(v => (
            <div key={v.id} className="fn-card fn-card-interactive p-5 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-110"
                  style={{ background: 'rgba(37,99,235,0.06)' }}>
                  {TYPE_ICONS[v.type] || '🚛'}
                </div>
                <div>
                  <div className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>{v.plate || v.licensePlate}</div>
                  <div className="text-xs" style={{ color: 'var(--fn-text-muted)' }}>{(v.type || '').replace(/_/g, ' ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium" style={{ color: 'var(--fn-text-secondary)' }}>
                {v.brand && <span>{v.brand} {v.model}</span>}
                {v.maxWeightKg && (
                  <span className="flex items-center gap-1">
                    <span className="text-sm">⚖️</span> {v.maxWeightKg} kg
                  </span>
                )}
                {v.maxVolumeM3 && (
                  <span className="flex items-center gap-1">
                    <span className="text-sm">📐</span> {v.maxVolumeM3} m³
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
