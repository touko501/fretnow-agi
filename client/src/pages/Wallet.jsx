import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

function AnimatedAmount({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    const duration = 900;
    const startTime = performance.now();
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="fn-number">{prefix}{display.toFixed(2).replace('.', ',')}{suffix}</span>;
}

const TX_CONFIG = {
  TOPUP: { icon: '💳', label: 'Rechargement', color: '#2563eb' },
  COMMISSION: { icon: '📊', label: 'Commission', color: '#7c3aed' },
  PAYMENT: { icon: '💰', label: 'Paiement', color: '#059669' },
  RESERVE: { icon: '🔒', label: 'Séquestre', color: '#f59e0b' },
  RELEASE: { icon: '✅', label: 'Libération', color: '#10b981' },
  REFUND: { icon: '↩️', label: 'Remboursement', color: '#6366f1' },
};

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

  if (loading) {
    return (
      <div className="fn-stagger">
        <div className="fn-skeleton h-8 w-40 mb-2" />
        <div className="fn-skeleton h-4 w-64 mb-8" />
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => <div key={i} className="fn-skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="fn-skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const bal = balance?.balance != null ? balance.balance / 100 : 0;
  const reserved = balance?.reserved != null ? balance.reserved / 100 : 0;
  const earned = balance?.totalEarned != null ? balance.totalEarned / 100 : 0;

  return (
    <div className="fn-animate-in">
      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>Portefeuille</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fn-text-secondary)' }}>Gérez votre solde et suivez vos transactions</p>
      </div>

      {/* Balance cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8 fn-stagger">
        {/* Main balance */}
        <div className="fn-gradient-card p-6 relative" style={{ background: 'var(--fn-gradient-primary)' }}>
          <div className="fn-orb" style={{ width: 100, height: 100, background: 'rgba(255,255,255,0.1)', top: -30, right: -20, filter: 'blur(40px)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.7"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Solde disponible</span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              <AnimatedAmount value={bal} suffix=" €" />
            </div>
          </div>
        </div>

        {/* Reserved */}
        <div className="fn-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--fn-gradient-warm)' }} />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔒</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>En séquestre</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            <AnimatedAmount value={reserved} suffix=" €" />
          </div>
        </div>

        {/* Total earned */}
        <div className="fn-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--fn-gradient-fresh)' }} />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📈</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fn-text-muted)' }}>Total gagné</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#059669' }}>
            <AnimatedAmount value={earned} suffix=" €" />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="fn-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--fn-text)' }}>Transactions</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fn-text-muted)' }}>{transactions.length} transaction(s)</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(37,99,235,0.06)' }}>
              <span className="text-3xl">💳</span>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fn-text)' }}>Aucune transaction</p>
            <p className="text-xs" style={{ color: 'var(--fn-text-muted)' }}>Vos transactions apparaîtront ici</p>
          </div>
        ) : (
          <div className="fn-stagger">
            {transactions.map((tx) => {
              const cfg = TX_CONFIG[tx.type] || { icon: '💰', label: tx.type, color: '#64748b' };
              const isPositive = tx.amountCents >= 0;
              return (
                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50/80"
                  style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${cfg.color}10` }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fn-text)' }}>{cfg.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--fn-text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {tx.description && ` — ${tx.description}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: isPositive ? '#059669' : '#dc2626' }}>
                    {isPositive ? '+' : ''}{(tx.amountCents / 100).toFixed(2).replace('.', ',')} €
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
