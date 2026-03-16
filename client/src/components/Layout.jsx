import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV = {
  CHARGEUR: [
    { path: '/dashboard', icon: '📊', label: 'Tableau de bord' },
    { path: '/missions', icon: '📦', label: 'Mes missions' },
    { path: '/missions/new', icon: '➕', label: 'Nouvelle mission', accent: true },
    { path: '/messagerie', icon: '🚀', label: 'Messagerie / Express' },
    { path: '/wallet', icon: '💰', label: 'Portefeuille' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/profile', icon: '👤', label: 'Profil' },
  ],
  TRANSPORTEUR: [
    { path: '/dashboard', icon: '📊', label: 'Tableau de bord' },
    { path: '/missions', icon: '🚛', label: 'Missions' },
    { path: '/my-bids', icon: '📝', label: 'Mes offres' },
    { path: '/messagerie', icon: '🚀', label: 'Messagerie / Express' },
    { path: '/vehicles', icon: '🚐', label: 'Véhicules' },
    { path: '/mobilic', icon: '⏱️', label: 'Mobilic' },
    { path: '/compliance', icon: '✅', label: 'Conformité' },
    { path: '/wallet', icon: '💰', label: 'Portefeuille' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/profile', icon: '👤', label: 'Profil' },
  ],
  ADMIN: [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/missions', icon: '📦', label: 'Missions' },
    { path: '/messagerie', icon: '🚀', label: 'Messagerie / Express' },
    { path: '/mobilic', icon: '⏱️', label: 'Mobilic' },
    { path: '/compliance', icon: '✅', label: 'Conformité' },
    { path: '/agents', icon: '⚙️', label: 'Automatisation' },
    { path: '/wallet', icon: '💰', label: 'Finance' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/profile', icon: '⚙️', label: 'Admin' },
  ],
};
NAV.SUPER_ADMIN = NAV.ADMIN;

function BetaPill() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      Bêta
    </div>
  );
}

function TimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user?.role || 'CHARGEUR';
  const items = NAV[role] || NAV.CHARGEUR;

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/missions/new') return location.pathname === '/missions/new';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--fn-bg)' }}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setOpen(false)}
          style={{ animation: 'fn-fade-in 0.2s var(--fn-ease) both' }} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] transform transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--fn-surface)', borderRight: '1px solid var(--fn-border-subtle)' }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md transition-transform duration-300 group-hover:scale-105"
                style={{ background: 'var(--fn-gradient-primary)' }}>
                F
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--fn-text)' }}>FRETNOW</span>
                <span className="block text-[10px] font-semibold tracking-wider uppercase"
                  style={{ background: 'var(--fn-gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Marketplace B2B
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto fn-stagger">
            {items.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative"
                  style={{
                    background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.05) 100%)' : 'transparent',
                    color: active ? '#2563eb' : 'var(--fn-text-secondary)',
                  }}>
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: 'var(--fn-gradient-primary)' }} />
                  )}
                  <span className="text-[17px] transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.accent && !active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Help card */}
          <div className="px-3 pb-3">
            <div className="rounded-xl p-4"
              style={{ background: 'var(--fn-surface)', border: '1px solid var(--fn-border-subtle)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">💡</span>
                <span className="text-xs font-bold" style={{ color: 'var(--fn-text)' }}>Besoin d'aide ?</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fn-text-muted)' }}>
                support@fretnow.com
              </p>
            </div>
          </div>

          {/* User section */}
          <div className="px-4 py-4" style={{ borderTop: '1px solid var(--fn-border-subtle)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ background: 'var(--fn-gradient-primary)' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--fn-text)' }}>{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] font-medium" style={{ color: 'var(--fn-text-muted)' }}>{role}</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg transition-all duration-200 text-left flex items-center gap-2"
              style={{ color: 'var(--fn-text-muted)' }}
              onMouseEnter={e => { e.target.style.color = '#ef4444'; e.target.style.background = 'rgba(239,68,68,0.06)'; }}
              onMouseLeave={e => { e.target.style.color = 'var(--fn-text-muted)'; e.target.style.background = 'transparent'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="fn-glass sticky top-0 z-30 px-4 lg:px-8 h-16 flex items-center gap-4 shrink-0"
          style={{ borderBottom: '1px solid var(--fn-border-subtle)' }}>
          {/* Mobile menu */}
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--fn-text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Greeting */}
          <div className="hidden lg:block">
            <span className="text-sm font-medium" style={{ color: 'var(--fn-text-secondary)' }}>
              <TimeGreeting />, <span style={{ color: 'var(--fn-text)' }}>{user?.firstName}</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Beta pill */}
          <BetaPill />

          {/* Notifications */}
          <Link to="/notifications" className="relative p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--fn-text-secondary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="fn-page-enter max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
