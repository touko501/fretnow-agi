import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [bRes, tRes] = await Promise.all([api.get('/wallet/balance'), api.get('/wallet/transactions')]);
      if (bRes?.ok) setBalance(await bRes.json());
      if (tRes?.ok) { const d = await tRes.json(); setTransactions(d.transactions || d || []); }
      setLoading(false);
    }
    load();
  }, []);

  const txIcons = { TOPUP: '💳', COMMISSION: '📊', PAYMENT: '💰', RESERVE: '🔒', RELEASE: '✅', REFUND: '↩️' };

  if (loading) return <div className="text-center py-20 text-gray-400">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Portefeuille</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-6 text-white">
          <p className="text-blue-200 text-sm">Solde disponible</p>
          <p className="text-3xl font-bold mt-1">{balance?.balance != null ? `${(balance.balance / 100).toFixed(2)} €` : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-gray-500 text-sm">En séquestre</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{balance?.reserved != null ? `${(balance.reserved / 100).toFixed(2)} €` : '0.00 €'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-gray-500 text-sm">Total gagné</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{balance?.totalEarned != null ? `${(balance.totalEarned / 100).toFixed(2)} €` : '0.00 €'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold">Transactions</h2></div>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune transaction</div>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{txIcons[tx.type] || '💰'}</span>
                  <div>
                    <p className="text-sm font-medium">{tx.type}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString('fr-FR')} {tx.description && `— ${tx.description}`}</p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.amountCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amountCents >= 0 ? '+' : ''}{(tx.amountCents / 100).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
