import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'CHARGEUR';
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: defaultRole, companyName: '', siren: '', siret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-blue-500 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700">🚛 FRETNOW</Link>
          <p className="text-gray-500 mt-2">Créez votre compte gratuitement</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Role selector */}
        <div className="flex gap-2 mb-6">
          {[{ value: 'CHARGEUR', label: '📦 Expéditeur' }, { value: 'TRANSPORTEUR', label: '🚛 Transporteur' }].map((r) => (
            <button key={r.value} type="button" onClick={() => update('role', r.value)}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition ${form.role === r.value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input required value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input required value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="votre@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="Min. 6 caractères" />
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700 mb-3">Entreprise</p>
            <div className="space-y-3">
              <input placeholder="Nom de l'entreprise" value={form.companyName} onChange={(e) => update('companyName', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="SIREN (9 chiffres)" value={form.siren} onChange={(e) => update('siren', e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" />
                <input placeholder="SIRET (14 chiffres)" value={form.siret} onChange={(e) => update('siret', e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Déjà inscrit ? <Link to="/login" className="text-brand-600 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
