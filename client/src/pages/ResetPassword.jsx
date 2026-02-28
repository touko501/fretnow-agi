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
    if (!token || !email) {
      setError('Lien de réinitialisation invalide. Veuillez refaire une demande.');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (password !== confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }

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
    if (score <= 1) return { level: 1, label: 'Faible', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Moyen', color: 'bg-yellow-500' };
    return { level: 3, label: 'Fort', color: 'bg-green-500' };
  };

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-blue-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700">
            🚛 FRETNOW
          </Link>
          <h2 className="text-xl font-bold text-gray-900 mt-4">Nouveau mot de passe</h2>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mot de passe réinitialisé !</h3>
            <p className="text-gray-500 text-sm mb-4">
              Votre mot de passe a été modifié avec succès. Redirection vers la connexion...
            </p>
            <Link to="/login"
              className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition text-sm">
              Se connecter maintenant
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            {token && email && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 px-4 py-2.5 rounded-lg text-sm text-gray-600">
                  Réinitialisation pour <strong>{decodeURIComponent(email)}</strong>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="Min. 8 caractères" autoFocus minLength={8} />
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">Force : {strength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                      confirmPassword && confirmPassword !== password ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Retapez le mot de passe" minLength={8} />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !password || password !== confirmPassword}
                  className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
                  {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            )}

            {(!token || !email) && (
              <div className="text-center mt-4">
                <Link to="/forgot-password"
                  className="text-brand-600 font-medium hover:underline text-sm">
                  Demander un nouveau lien →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
