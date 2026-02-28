import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-blue-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700">
            🚛 FRETNOW
          </Link>
          <p className="text-gray-500 mt-2">Connectez-vous à votre compte</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
              placeholder="votre@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          Pas encore de compte ? <Link to="/register" className="text-brand-600 font-medium hover:underline">S'inscrire</Link>
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-gray-400 text-center mb-3">Comptes démo</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setEmail('admin@fretnow.com'); setPassword('admin123'); }}
              className="text-xs px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Admin</button>
            <button onClick={() => { setEmail('transporteur@fretnow.com'); setPassword('admin123'); }}
              className="text-xs px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Transporteur</button>
          </div>
        </div>
      </div>
    </div>
  );
}
