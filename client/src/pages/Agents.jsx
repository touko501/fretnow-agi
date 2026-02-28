import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Agents() {
  const [agents, setAgents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await api.get('/agents/status');
      if (res?.ok) setAgents(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;

  const agentList = [
    { id: '001', name: 'MatcherAgent', icon: '🎯', desc: 'Matching multi-critères intelligent' },
    { id: '002', name: 'PricingAgent', icon: '💰', desc: 'Tarification dynamique CNR' },
    { id: '003', name: 'ScoutAgent', icon: '🔍', desc: 'Prospection automatisée' },
    { id: '004', name: 'CommsAgent', icon: '📧', desc: 'Notifications et relances' },
    { id: '005', name: 'ConvertAgent', icon: '📈', desc: 'Optimisation conversion' },
    { id: '006', name: 'RiskAgent', icon: '🛡️', desc: 'Scoring risque et fraude' },
    { id: '007', name: 'PredictAgent', icon: '🔮', desc: 'Prédiction de demande' },
    { id: '008', name: 'AnalystAgent', icon: '📊', desc: 'Analytics et KPIs' },
    { id: '009', name: 'NOVA', icon: '🤖', desc: 'Marketing et brand voice' },
    { id: '010', name: 'ComplianceAgent', icon: '⏱️', desc: 'Conformité Mobilic' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🤖 Agents IA</h1>
      <p className="text-gray-500 mb-8">10 agents spécialisés travaillent en continu pour optimiser la plateforme</p>

      <div className="grid md:grid-cols-2 gap-4">
        {agentList.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <h3 className="font-semibold text-sm">#{a.id} {a.name}</h3>
                <p className="text-xs text-gray-500">{a.desc}</p>
              </div>
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Actif</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cortex */}
      <div className="mt-8 bg-gradient-to-r from-brand-700 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🧠</span>
          <div>
            <h2 className="text-xl font-bold">Cortex — Cerveau Central</h2>
            <p className="text-blue-200">Orchestrateur qui coordonne les 10 agents en temps réel pour chaque décision.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
