import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.me();
      if (res?.ok) { const d = await res.json(); setUser(d.user || d); }
    } catch (e) { console.error('refreshUser error', e); }
  };

  useEffect(() => {
    const token = localStorage.getItem('fretnow_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
    localStorage.setItem('fretnow_token', data.token);
    if (data.refreshToken) localStorage.setItem('fretnow_refresh', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
    localStorage.setItem('fretnow_token', data.token);
    if (data.refreshToken) localStorage.setItem('fretnow_refresh', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('fretnow_token');
    localStorage.removeItem('fretnow_refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
