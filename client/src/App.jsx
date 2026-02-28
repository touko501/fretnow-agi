import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetail from './pages/MissionDetail';
import CreateMission from './pages/CreateMission';
import Messagerie from './pages/Messagerie';
import Wallet from './pages/Wallet';
import Mobilic from './pages/Mobilic';
import Compliance from './pages/Compliance';
import Agents from './pages/Agents';
import Profile from './pages/Profile';
import Vehicles from './pages/Vehicles';
import Notifications from './pages/Notifications';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Blog from './pages/Blog';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/dashboard" /> : <ResetPassword />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<Blog />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
      <Route path="/missions/new" element={<ProtectedRoute><CreateMission /></ProtectedRoute>} />
      <Route path="/missions/:id" element={<ProtectedRoute><MissionDetail /></ProtectedRoute>} />
      <Route path="/messagerie" element={<ProtectedRoute><Messagerie /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/mobilic" element={<ProtectedRoute><Mobilic /></ProtectedRoute>} />
      <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/my-bids" element={<ProtectedRoute><Missions /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
