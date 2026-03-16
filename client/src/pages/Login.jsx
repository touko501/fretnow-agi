import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0a0e27 0%, #0f172a 40%, #131b35 100%)' }}>

      {/* Animated orbs */}
      <div className="fn-orb" style={{ width: 400, height: 400, background: '#2563eb', top: '-10%', left: '-5%', opacity: 0.15, filter: 'blur(100px)', animationDelay: '0s' }} />
      <div className="fn-orb" style={{ width: 350, height: 350, background: '#7c3aed', bottom: '-10%', right: '-5%', opacity: 0.12, filter: 'blur(100px)', animationDelay: '2s' }} />
      <div className="fn-orb" style={{ width: 200, height: 200, background: '#06b6d4', top: '40%', right: '20%', opacity: 0.08, filter: 'blur(80px)', animationDelay: '4s' }} />

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative z-10 fn-animate-slide-left">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 0 30px rgba(37,99,235,0.3)' }}>
              F
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">FRETNOW</span>
          </Link>
        </div>

        <div className="max-w-md">
          <h1 className="text-[40px] font-extrabold text-white leading-tight tracking-tight mb-4">
            Le fret routier,
            <br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              réinventé.
            </span>
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Commission 10% au lieu de 25%. Paiement J+1 garanti.
            10 agents IA qui optimisent chaque trajet.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 mt-8">
            {[
              { value: '10%', label: 'Commission' },
              { value: 'J+1', label: 'Paiement' },
              { value: '10', label: 'Agents IA' },
            ].map((s, i) => (
              <div key={i} className="fn-animate-in-up" style={{ animationDelay: `${400 + i * 100}ms` }}>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          &copy; 2026 FRETNOW. La marketplace B2B du transport routier.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[420px] fn-animate-scale">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: 'var(--fn-gradient-primary)' }}>F</div>
              <span className="text-xl font-extrabold text-white">FRETNOW</span>
            </Link>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-8"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}>
            <div className="mb-7">
              <h2 className="text-[22px] font-bold text-white tracking-tight">Connexion</h2>
              <p className="text-sm text-slate-400 mt-1">Accédez à votre espace FRETNOW</p>
            </div>

            {error && (
              <div className="fn-animate-in mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="votre@email.com" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mot de passe</label>
                  <Link to="/forgot-password" className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors">Oublié ?</Link>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.08)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1">
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40"
                style={{
                  background: 'var(--fn-gradient-primary)',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(37,99,235,0.3)',
                }}
                onMouseEnter={e => { if (!loading) e.target.style.boxShadow = '0 8px 25px rgba(37,99,235,0.4)'; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.target.style.boxShadow = '0 4px 15px rgba(37,99,235,0.3)'; e.target.style.transform = 'translateY(0)'; }}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">Pas encore de compte ? </span>
              <Link to="/register" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">S'inscrire</Link>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="mt-5 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] text-slate-500 font-medium mb-3 text-center uppercase tracking-wider">Comptes démo</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Admin', email: 'admin@fretnow.com', icon: '⚙️' },
                { label: 'Transporteur', email: 'transporteur@fretnow.com', icon: '🚛' },
              ].map((demo) => (
                <button key={demo.label} onClick={() => { setEmail(demo.email); setPassword('admin123'); }}
                  className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                  <span>{demo.icon}</span> {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
