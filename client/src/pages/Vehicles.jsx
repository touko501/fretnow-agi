import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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

  const inp = "px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500";
  const types = ['FOURGON_3T5', 'FOURGON_20M3', 'PORTEUR_7T5', 'PORTEUR_19T', 'SEMI_TAUTLINER', 'SEMI_FRIGO', 'SEMI_BACHE'];

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma flotte</h1>
          <p className="text-gray-500 text-sm mt-1">{vehicles.length} véhicule{vehicles.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl text-sm hover:bg-blue-700">+ Ajouter</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nouveau véhicule</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <select value={f.type} onChange={e => u('type', e.target.value)} className={inp + " bg-white"}>{types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
            <input value={f.plate} onChange={e => u('plate', e.target.value)} placeholder="Immatriculation" className={inp} />
            <input value={f.brand} onChange={e => u('brand', e.target.value)} placeholder="Marque" className={inp} />
            <input value={f.model} onChange={e => u('model', e.target.value)} placeholder="Modèle" className={inp} />
            <input type="number" value={f.maxWeightKg} onChange={e => u('maxWeightKg', e.target.value)} placeholder="Charge max (kg)" className={inp} />
            <input type="number" value={f.maxVolumeM3} onChange={e => u('maxVolumeM3', e.target.value)} placeholder="Volume max (m³)" className={inp} />
          </div>
          <button onClick={add} className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 text-sm">Enregistrer</button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🚐</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun véhicule</h3>
          <p className="text-gray-500 text-sm">Ajoutez votre premier véhicule pour commencer à répondre aux missions.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-xl">🚛</div>
                <div>
                  <div className="font-semibold text-gray-900">{v.plate || v.licensePlate}</div>
                  <div className="text-sm text-gray-500">{(v.type || '').replace(/_/g, ' ')}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {v.brand && <span>{v.brand} {v.model}</span>}
                {v.maxWeightKg && <span> · {v.maxWeightKg}kg</span>}
                {v.maxVolumeM3 && <span> · {v.maxVolumeM3}m³</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
