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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-blue-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700">
            🚛 FRETNOW
          </Link>
          <h2 className="text-xl font-bold text-gray-900 mt-4">Mot de passe oublié</h2>
          <p className="text-gray-500 mt-2 text-sm">Entrez votre email, nous vous enverrons un lien de réinitialisation.</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✉️</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Email envoyé !</h3>
            <p className="text-gray-500 text-sm mb-6">
              Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
            </p>
            <p className="text-gray-400 text-xs mb-6">
              Vérifiez vos spams si vous ne voyez rien dans votre boîte de réception.
            </p>
            <div className="space-y-3">
              <button onClick={() => { setSent(false); setEmail(''); }}
                className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
                Renvoyer un email
              </button>
              <Link to="/login"
                className="block w-full text-center bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition text-sm">
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="votre@email.com" autoFocus />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <Link to="/login" className="text-brand-600 font-medium hover:underline">← Retour à la connexion</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
