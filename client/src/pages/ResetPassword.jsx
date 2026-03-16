import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) setError('Lien de réinitialisation invalide. Veuillez refaire une demande.');
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirmPassword) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      await api.resetPassword(token, email, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally { setLoading(false); }
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: 'Faible', color: '#ef4444' };
    if (score <= 3) return { level: 2, label: 'Moyen', color: '#f59e0b' };
    return { level: 3, label: 'Fort', color: '#10b981' };
  };

  const strength = passwordStrength(password);
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' };
  const focusHandlers = {
    onFocus: e => { e.target.style.borderColor = 'rgba(37,99,235,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; },
    onBlur: e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; },
  };
  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all duration-200";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'linear-gradient(145deg, #0a0e27 0%, #0f172a 40%, #131b35 100%)' }}>

      <div className="fn-orb" style={{ width: 400, height: 400, background: '#2563eb', top: '-15%', right: '-10%', opacity: 0.15, filter: 'blur(100px)' }} />
      <div className="fn-orb" style={{ width: 300, height: 300, background: '#06b6d4', bottom: '-10%', left: '-5%', opacity: 0.12, filter: 'blur(100px)', animationDelay: '2s' }} />

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

          {success ? (
            <div className="text-center fn-animate-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Mot de passe réinitialisé !</h3>
              <p className="text-sm text-slate-400 mb-4">
                Votre mot de passe a été modifié avec succès. Redirection vers la connexion...
              </p>
              <Link to="/login"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--fn-gradient-primary)', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}>
                Se connecter maintenant
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Nouveau mot de passe</h2>
                <p className="text-sm text-slate-400 mt-1">Choisissez un mot de passe sécurisé</p>
              </div>

              {error && (
                <div className="fn-animate-in mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  {error}
                </div>
              )}

              {token && email && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="px-4 py-2.5 rounded-xl text-sm text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Réinitialisation pour <strong className="text-slate-300">{decodeURIComponent(email)}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Nouveau mot de passe</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      className={inputClass} style={inputStyle} {...focusHandlers} placeholder="Min. 8 caractères" autoFocus minLength={8} />
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength.level ? strength.color : 'rgba(255,255,255,0.08)' }} />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">Force : {strength.label}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Confirmer le mot de passe</label>
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      style={{
                        ...inputStyle,
                        borderColor: confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : inputStyle.border,
                      }}
                      {...focusHandlers} placeholder="Retapez le mot de passe" minLength={8} />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || !password || password !== confirmPassword}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40"
                    style={{ background: 'var(--fn-gradient-primary)', boxShadow: loading ? 'none' : '0 4px 15px rgba(37,99,235,0.3)' }}>
                    {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                  </button>
                </form>
              )}

              {(!token || !email) && (
                <div className="text-center mt-4">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    Demander un nouveau lien →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
