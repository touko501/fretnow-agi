import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const TYPE_LABELS = { MESSAGERIE: '📦 Messagerie', EXPRESS: '⚡ Express', DERNIER_KM: '🏙️ Dernier km' };
const SLA_LABELS = { BEFORE_12H: 'Avant 12h', BEFORE_18H: 'Avant 18h', SAME_DAY: 'Même jour', J_PLUS_1: 'J+1' };
const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700', PUBLISHED: 'bg-blue-100 text-blue-700', BIDDING: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-purple-100 text-purple-700', IN_TRANSIT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700', COMPLETED: 'bg-green-100 text-green-800',
};

function SlaCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function Messagerie() {
  const { user } = useAuth();
  const [tab, setTab] = useState('missions');
  const [filter, setFilter] = useState('');
  const [missions, setMissions] = useState([]);
  const [sla, setSla] = useState(null);
  const [slaStats, setSlaStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    missionType: 'MESSAGERIE', slaType: 'J_PLUS_1', parcelCount: 1, parcelRef: '',
    recipientName: '', recipientPhone: '', signatureRequired: false,
    pickupAddress: '', pickupCity: '', deliveryAddress: '', deliveryCity: '',
    weightKg: '', description: ''
  });

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const params = filter ? `type=${filter}` : '';
      const [m, s, st] = await Promise.all([
        api.getMessagerMissions(params).catch(() => ({ missions: [] })),
        api.getSlaOverview().catch(() => null),
        api.getSlaStats().catch(() => null),
      ]);
      setMissions(m.missions || m || []);
      setSla(s);
      setSlaStats(st);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const uf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const createMission = async () => {
    try {
      await api.createMessagerMission({
        ...form,
        parcelCount: parseInt(form.parcelCount) || 1,
        weightKg: parseFloat(form.weightKg) || undefined
      });
      setShowCreate(false);
      setForm({ missionType: 'MESSAGERIE', slaType: 'J_PLUS_1', parcelCount: 1, parcelRef: '', recipientName: '', recipientPhone: '', signatureRequired: false, pickupAddress: '', pickupCity: '', deliveryAddress: '', deliveryCity: '', weightKg: '', description: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500";
  const isChargeur = user?.role === 'CHARGEUR' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messagerie & Express</h1>
          <p className="text-gray-500 text-sm mt-1">Colis, palettes et livraisons express</p>
        </div>
        {isChargeur && (
          <button onClick={() => setShowCreate(!showCreate)} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl text-sm hover:bg-blue-700">
            + Nouvelle expédition
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['missions', 'sla'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t === 'missions' ? '📦 Missions' : '📊 Performance SLA'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nouvelle expédition</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={form.missionType} onChange={e => uf('missionType', e.target.value)} className={inp + " bg-white"}>
                <option value="MESSAGERIE">📦 Messagerie</option>
                <option value="EXPRESS">⚡ Express</option>
                <option value="DERNIER_KM">🏙️ Dernier km</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">SLA</label>
              <select value={form.slaType} onChange={e => uf('slaType', e.target.value)} className={inp + " bg-white"}>
                <option value="BEFORE_12H">Avant 12h</option>
                <option value="BEFORE_18H">Avant 18h</option>
                <option value="SAME_DAY">Même jour</option>
                <option value="J_PLUS_1">J+1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nb colis</label>
              <input type="number" value={form.parcelCount} onChange={e => uf('parcelCount', e.target.value)} className={inp} min="1" />
            </div>
            <input value={form.parcelRef} onChange={e => uf('parcelRef', e.target.value)} placeholder="Référence colis" className={inp} />
            <input value={form.recipientName} onChange={e => uf('recipientName', e.target.value)} placeholder="Nom destinataire" className={inp} />
            <input value={form.recipientPhone} onChange={e => uf('recipientPhone', e.target.value)} placeholder="Tél destinataire" className={inp} />
            <input value={form.pickupAddress} onChange={e => uf('pickupAddress', e.target.value)} placeholder="Adresse enlèvement" className={inp} />
            <input value={form.pickupCity} onChange={e => uf('pickupCity', e.target.value)} placeholder="Ville enlèvement" className={inp} />
            <input value={form.weightKg} onChange={e => uf('weightKg', e.target.value)} placeholder="Poids (kg)" type="number" className={inp} />
            <input value={form.deliveryAddress} onChange={e => uf('deliveryAddress', e.target.value)} placeholder="Adresse livraison" className={inp} />
            <input value={form.deliveryCity} onChange={e => uf('deliveryCity', e.target.value)} placeholder="Ville livraison" className={inp} />
            <div className="flex items-center gap-2 px-3">
              <input type="checkbox" checked={form.signatureRequired} onChange={e => uf('signatureRequired', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label className="text-sm text-gray-700">Signature requise</label>
            </div>
          </div>
          <input value={form.description} onChange={e => uf('description', e.target.value)} placeholder="Description / instructions" className={inp + " mb-4"} />
          <button onClick={createMission} className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 text-sm">Créer l'expédition</button>
        </div>
      )}

      {/* Mission tab */}
      {tab === 'missions' && (
        <>
          <div className="flex gap-2 mb-4">
            {['', 'MESSAGERIE', 'EXPRESS', 'DERNIER_KM'].map(t => (
              <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t ? TYPE_LABELS[t] : 'Tous'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : missions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune mission</h3>
              <p className="text-gray-500 text-sm">Les missions messagerie et express apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missions.map(m => (
                <Link to={`/missions/${m.id}`} key={m.id} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{TYPE_LABELS[m.missionType] || m.missionType}</span>
                      {m.slaType && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{SLA_LABELS[m.slaType]}</span>}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>{m.status}</span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">{m.pickupCity} → {m.deliveryCity}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {m.parcelCount && <span>{m.parcelCount} colis</span>}
                    {m.recipientName && <span>→ {m.recipientName}</span>}
                    {m.reference && <span>{m.reference}</span>}
                    {m.signatureRequired && <span className="text-blue-600">✍️ Signature</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* SLA tab */}
      {tab === 'sla' && (
        <div>
          {sla ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SlaCard label="Total missions" value={sla.total || 0} color="bg-white" />
              <SlaCard label="SLA respecté" value={`${sla.onTimeRate || 0}%`} color={sla.onTimeRate >= 90 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} />
              <SlaCard label="Livrées à temps" value={sla.onTime || 0} color="bg-green-50 border-green-200" />
              <SlaCard label="En retard" value={sla.late || 0} color="bg-red-50 border-red-200" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Aucune donnée SLA disponible</div>
          )}

          {slaStats && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Performance par type</h3>
              <div className="space-y-4">
                {(slaStats.stats || slaStats || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-sm">{TYPE_LABELS[s.type] || s.type}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{s.count} missions</span>
                      <span className={s.onTimeRate >= 90 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{s.onTimeRate}% à temps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
