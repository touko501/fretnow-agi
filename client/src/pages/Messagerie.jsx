import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const TYPE_LABELS = { MESSAGERIE: '📦 Messagerie', EXPRESS: '⚡ Express', DERNIER_KM: '🏠 Dernier km' };
const SLA_LABELS = { BEFORE_12H: 'Avant 12h', BEFORE_18H: 'Avant 18h', SAME_DAY: 'Même jour', J_PLUS_1: 'J+1' };

const STATUS_CONFIG = {
  DRAFT: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8' },
  PUBLISHED: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', dot: '#3b82f6' },
  BIDDING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  ASSIGNED: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', dot: '#8b5cf6' },
  IN_TRANSIT: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', dot: '#f97316' },
  DELIVERED: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', dot: '#10b981' },
  COMPLETED: { color: '#059669', bg: 'rgba(5,150,105,0.1)', dot: '#059669' },
};

function SlaCard({ label, value, icon, color }) {
  return (
    <div className="fn-card p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: color || 'var(--fn-gradient-primary)' }} />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--fn-text)' }}>{value}</div>
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

  const isChargeur = user?.role === 'CHARGEUR' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="fn-animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Messagerie & Express</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fn-text-secondary)' }}>Colis, palettes et livraisons express</p>
        </div>
        {isChargeur && (
          <button onClick={() => setShowCreate(!showCreate)} className="fn-btn fn-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle expédition
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6">
        {[{ key: 'missions', label: '📦 Missions' }, { key: 'sla', label: '📊 Performance SLA' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200"
            style={{
              background: tab === t.key ? 'var(--fn-gradient-primary)' : 'var(--fn-surface)',
              color: tab === t.key ? 'white' : 'var(--fn-text-secondary)',
              border: tab === t.key ? 'none' : '1px solid var(--fn-border)',
              boxShadow: tab === t.key ? '0 2px 8px rgba(37,99,235,0.25)' : 'var(--fn-shadow-xs)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="fn-card p-6 mb-6 fn-animate-in">
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--fn-text)' }}>Nouvelle expédition</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fn-text-muted)' }}>Type</label>
              <select value={form.missionType} onChange={e => uf('missionType', e.target.value)} className="fn-input w-full">
                <option value="MESSAGERIE">📦 Messagerie</option>
                <option value="EXPRESS">⚡ Express</option>
                <option value="DERNIER_KM">🏠 Dernier km</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fn-text-muted)' }}>SLA</label>
              <select value={form.slaType} onChange={e => uf('slaType', e.target.value)} className="fn-input w-full">
                <option value="BEFORE_12H">Avant 12h</option>
                <option value="BEFORE_18H">Avant 18h</option>
                <option value="SAME_DAY">Même jour</option>
                <option value="J_PLUS_1">J+1</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fn-text-muted)' }}>Nb colis</label>
              <input type="number" value={form.parcelCount} onChange={e => uf('parcelCount', e.target.value)} className="fn-input w-full" min="1" />
            </div>
            <input value={form.parcelRef} onChange={e => uf('parcelRef', e.target.value)} placeholder="Référence colis" className="fn-input" />
            <input value={form.recipientName} onChange={e => uf('recipientName', e.target.value)} placeholder="Nom destinataire" className="fn-input" />
            <input value={form.recipientPhone} onChange={e => uf('recipientPhone', e.target.value)} placeholder="Tél destinataire" className="fn-input" />
            <input value={form.pickupAddress} onChange={e => uf('pickupAddress', e.target.value)} placeholder="Adresse enlèvement" className="fn-input" />
            <input value={form.pickupCity} onChange={e => uf('pickupCity', e.target.value)} placeholder="Ville enlèvement" className="fn-input" />
            <input value={form.weightKg} onChange={e => uf('weightKg', e.target.value)} placeholder="Poids (kg)" type="number" className="fn-input" />
            <input value={form.deliveryAddress} onChange={e => uf('deliveryAddress', e.target.value)} placeholder="Adresse livraison" className="fn-input" />
            <input value={form.deliveryCity} onChange={e => uf('deliveryCity', e.target.value)} placeholder="Ville livraison" className="fn-input" />
            <div className="flex items-center gap-2 px-3">
              <input type="checkbox" checked={form.signatureRequired} onChange={e => uf('signatureRequired', e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded" />
              <label className="text-sm" style={{ color: 'var(--fn-text-secondary)' }}>Signature requise</label>
            </div>
          </div>
          <input value={form.description} onChange={e => uf('description', e.target.value)} placeholder="Description / instructions" className="fn-input w-full mb-4" />
          <button onClick={createMission}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
            Créer l'expédition
          </button>
        </div>
      )}

      {/* Missions tab */}
      {tab === 'missions' && (
        <>
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {[{ key: '', label: 'Tous' }, { key: 'MESSAGERIE', label: '📦 Messagerie' }, { key: 'EXPRESS', label: '⚡ Express' }, { key: 'DERNIER_KM', label: '🏠 Dernier km' }].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200"
                style={{
                  background: filter === t.key ? 'rgba(37,99,235,0.08)' : 'transparent',
                  color: filter === t.key ? '#3b82f6' : 'var(--fn-text-muted)',
                  border: filter === t.key ? '1px solid rgba(37,99,235,0.15)' : '1px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3 fn-stagger">
              {[...Array(3)].map((_, i) => <div key={i} className="fn-skeleton h-24 rounded-2xl" />)}
            </div>
          ) : missions.length === 0 ? (
            <div className="fn-card text-center py-20 fn-animate-scale">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                style={{ background: 'rgba(37,99,235,0.06)' }}>
                <span className="text-4xl">📦</span>
              </div>
              <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune mission</p>
              <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Les missions messagerie et express apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3 fn-stagger">
              {missions.map(m => {
                const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.DRAFT;
                return (
                  <Link to={`/missions/${m.id}`} key={m.id} className="fn-card fn-card-interactive block p-5 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{TYPE_LABELS[m.missionType] || m.missionType}</span>
                        {m.slaType && (
                          <span className="fn-badge" style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f97316' }} />
                            {SLA_LABELS[m.slaType]}
                          </span>
                        )}
                      </div>
                      <span className="fn-badge" style={{ background: sc.bg, color: sc.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                        {m.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[15px] font-bold transition-colors group-hover:text-blue-600" style={{ color: 'var(--fn-text)' }}>{m.pickupCity}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fn-text-muted)' }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      <span className="text-[15px] font-bold transition-colors group-hover:text-blue-600" style={{ color: 'var(--fn-text)' }}>{m.deliveryCity}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium" style={{ color: 'var(--fn-text-muted)' }}>
                      {m.parcelCount && <span>{m.parcelCount} colis</span>}
                      {m.recipientName && <span>→ {m.recipientName}</span>}
                      {m.reference && <span className="font-mono">{m.reference}</span>}
                      {m.signatureRequired && <span style={{ color: '#3b82f6' }}>✍️ Signature</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SLA tab */}
      {tab === 'sla' && (
        <div>
          {sla ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fn-stagger">
              <SlaCard label="Total missions" value={sla.total || 0} icon="📊" />
              <SlaCard label="SLA respecté" value={`${sla.onTimeRate || 0}%`} icon={sla.onTimeRate >= 90 ? '✅' : '⚠️'}
                color={sla.onTimeRate >= 90 ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #dc2626, #ef4444)'} />
              <SlaCard label="Livrées à temps" value={sla.onTime || 0} icon="🎯" color="linear-gradient(135deg, #059669, #10b981)" />
              <SlaCard label="En retard" value={sla.late || 0} icon="🔴" color="linear-gradient(135deg, #dc2626, #ef4444)" />
            </div>
          ) : (
            <div className="fn-card text-center py-12">
              <p className="text-sm" style={{ color: 'var(--fn-text-muted)' }}>Aucune donnée SLA disponible</p>
            </div>
          )}

          {slaStats && (
            <div className="fn-card overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>Performance par type</h3>
              </div>
              <div>
                {(slaStats.stats || slaStats || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50/50"
                    style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{TYPE_LABELS[s.type] || s.type}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: 'var(--fn-text-muted)' }}>{s.count} missions</span>
                      <span className="font-bold" style={{ color: s.onTimeRate >= 90 ? '#10b981' : '#ef4444' }}>{s.onTimeRate}% à temps</span>
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
