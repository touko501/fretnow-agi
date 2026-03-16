import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' };
  const focusHandlers = {
    onFocus: e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; },
    onBlur: e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; },
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'linear-gradient(145deg, #0a0e27 0%, #0f172a 40%, #131b35 100%)' }}>

      <div className="fn-orb" style={{ width: 400, height: 400, background: '#2563eb', top: '-15%', left: '-10%', opacity: 0.15, filter: 'blur(100px)' }} />
      <div className="fn-orb" style={{ width: 300, height: 300, background: '#7c3aed', bottom: '-10%', right: '-5%', opacity: 0.12, filter: 'blur(100px)', animationDelay: '2s' }} />

      <div className="w-full max-w-[420px] fn-animate-scale relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 0 30px rgba(37,99,235,0.3)' }}>F</div>
            <span className="text-xl font-extrabold text-white">FRETNOW</span>
          </Link>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

          {sent ? (
            <div className="text-center fn-animate-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <span className="text-3xl">✉️</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Email envoyé !</h3>
              <p className="text-sm text-slate-400 mb-2">
                Si un compte existe avec l'adresse <strong className="text-slate-300">{email}</strong>, vous recevrez un lien de réinitialisation.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Vérifiez vos spams si vous ne voyez rien dans votre boîte de réception.
              </p>
              <div className="space-y-3">
                <button onClick={() => { setSent(false); setEmail(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-all duration-200"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  Renvoyer un email
                </button>
                <Link to="/login"
                  className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200"
                  style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}>
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Mot de passe oublié</h2>
                <p className="text-sm text-slate-400 mt-1">Entrez votre email, nous vous enverrons un lien de réinitialisation.</p>
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
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Adresse email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all duration-200"
                    style={inputStyle} {...focusHandlers} placeholder="votre@email.com" autoFocus />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40"
                  style={{ background: 'var(--fn-gradient-primary)', boxShadow: loading ? 'none' : '0 4px 15px rgba(37,99,235,0.3)' }}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Envoi...
                    </span>
                  ) : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">← Retour à la connexion</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
