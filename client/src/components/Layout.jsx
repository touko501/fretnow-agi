import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV = {
  CHARGEUR: [
    { path: '/dashboard', icon: '📊', label: 'Tableau de bord' },
    { path: '/missions', icon: '📦', label: 'Mes missions' },
    { path: '/missions/new', icon: '➕', label: 'Nouvelle mission' },
    { path: '/messagerie', icon: '🚀', label: 'Messagerie / Express' },
    { path: '/wallet', icon: '💰', label: 'Portefeuille' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/profile', icon: '👤', label: 'Profil' },
  ],
  TRANSPORTEUR: [
    { path: '/dashboard', icon: '📊', label: 'Tableau de bord' },
    { path: '/missions', icon: '🚛', label: 'Missions' },
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
    { path: '/agents', icon: '🤖', label: 'Agents IA' },
    { path: '/wallet', icon: '💰', label: 'Finance' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/profile', icon: '⚙️', label: 'Admin' },
  ],
};

// Also alias SUPER_ADMIN to ADMIN
NAV.SUPER_ADMIN = NAV.ADMIN;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user?.role || 'CHARGEUR';
  const items = NAV[role] || NAV.CHARGEUR;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-gray-100">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold text-lg">F</div>
              <div>
                <span className="text-lg font-bold text-gray-900">FRETNOW</span>
                <span className="block text-xs text-blue-600 font-medium -mt-0.5">Powered by NOVA AI</span>
              </div>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {items.map(i => (
              <Link key={i.path} to={i.path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${location.pathname === i.path || (i.path !== '/missions/new' && location.pathname.startsWith(i.path) && i.path !== '/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span className="text-lg">{i.icon}</span>{i.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-semibold text-sm">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{role}</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/'); }} className="w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-left">
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-4 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden p-1.5 text-gray-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1" />
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">NOVA AI Active</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
