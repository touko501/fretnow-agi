import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'CHARGEUR';
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: defaultRole, companyName: '', siren: '', siret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.08)',
  };
  const focusHandlers = {
    onFocus: e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; },
    onBlur: e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; },
  };
  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all duration-200";

  return (
    <div className="min-h-screen flex relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0a0e27 0%, #0f172a 40%, #131b35 100%)' }}>

      {/* Animated orbs */}
      <div className="fn-orb" style={{ width: 400, height: 400, background: '#7c3aed', top: '-10%', right: '-5%', opacity: 0.15, filter: 'blur(100px)', animationDelay: '0s' }} />
      <div className="fn-orb" style={{ width: 350, height: 350, background: '#2563eb', bottom: '-10%', left: '-5%', opacity: 0.12, filter: 'blur(100px)', animationDelay: '2s' }} />
      <div className="fn-orb" style={{ width: 200, height: 200, background: '#06b6d4', top: '50%', left: '30%', opacity: 0.08, filter: 'blur(80px)', animationDelay: '4s' }} />

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
            Rejoignez la
            <br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              révolution.
            </span>
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Inscrivez-vous gratuitement et accédez à la marketplace
            B2B qui transforme le transport routier.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: '💰', text: 'Commission 10% au lieu de 25%' },
              { icon: '⚡', text: 'Paiement garanti J+1' },
              { icon: '🎯', text: 'Matching intelligent expéditeur-transporteur' },
              { icon: '🔒', text: '0€ d\'abonnement — toujours' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 fn-animate-in-up" style={{ animationDelay: `${400 + i * 100}ms` }}>
                <span className="text-lg">{b.icon}</span>
                <span className="text-sm text-slate-300">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">&copy; 2026 FRETNOW. La marketplace B2B du transport routier.</p>
      </div>

      {/* Right panel — register form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[460px] fn-animate-scale">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: 'var(--fn-gradient-primary)' }}>F</div>
              <span className="text-xl font-extrabold text-white">FRETNOW</span>
            </Link>
          </div>

          <div className="rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
            <div className="mb-6">
              <h2 className="text-[22px] font-bold text-white tracking-tight">Créer un compte</h2>
              <p className="text-sm text-slate-400 mt-1">Rejoignez FRETNOW gratuitement</p>
            </div>

            {error && (
              <div className="fn-animate-in mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="flex gap-2 mb-6">
              {[{ value: 'CHARGEUR', label: 'Expéditeur', icon: '📦' }, { value: 'TRANSPORTEUR', label: 'Transporteur', icon: '🚛' }].map((r) => (
                <button key={r.value} type="button" onClick={() => update('role', r.value)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={{
                    background: form.role === r.value ? 'var(--fn-gradient-primary)' : 'rgba(255,255,255,0.04)',
                    color: form.role === r.value ? 'white' : 'rgba(255,255,255,0.5)',
                    border: form.role === r.value ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: form.role === r.value ? '0 4px 15px rgba(37,99,235,0.3)' : 'none',
                  }}>
                  <span>{r.icon}</span> {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Prénom</label>
                  <input required value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                    className={inputClass} style={inputStyle} {...focusHandlers} placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Nom</label>
                  <input required value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                    className={inputClass} style={inputStyle} {...focusHandlers} placeholder="Dupont" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Email</label>
                <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                  className={inputClass} style={inputStyle} {...focusHandlers} placeholder="votre@email.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Téléphone</label>
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)}
                  className={inputClass} style={inputStyle} {...focusHandlers} placeholder="06 12 34 56 78" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mot de passe</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)}
                    className={inputClass + " pr-11"} style={inputStyle} {...focusHandlers} placeholder="Min. 6 caractères" />
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

              <div className="pt-4 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Entreprise</p>
                <div className="space-y-3">
                  <input placeholder="Nom de l'entreprise" value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
                    className={inputClass} style={inputStyle} {...focusHandlers} />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="SIREN (9 chiffres)" value={form.siren} onChange={(e) => update('siren', e.target.value)}
                      className={inputClass} style={inputStyle} {...focusHandlers} />
                    <input placeholder="SIRET (14 chiffres)" value={form.siret} onChange={(e) => update('siret', e.target.value)}
                      className={inputClass} style={inputStyle} {...focusHandlers} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 mt-2"
                style={{ background: 'var(--fn-gradient-primary)', boxShadow: loading ? 'none' : '0 4px 15px rgba(37,99,235,0.3)' }}
                onMouseEnter={e => { if (!loading) { e.target.style.boxShadow = '0 8px 25px rgba(37,99,235,0.4)'; e.target.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { e.target.style.boxShadow = '0 4px 15px rgba(37,99,235,0.3)'; e.target.style.transform = 'translateY(0)'; }}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Création...
                  </span>
                ) : 'Créer mon compte'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">Déjà inscrit ? </span>
              <Link to="/login" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">Se connecter</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
