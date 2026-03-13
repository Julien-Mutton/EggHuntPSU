/**
 * App — main routing configuration.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';

// User pages
import Dashboard from './pages/Dashboard';
import Redeem from './pages/Redeem';
import ScanQR from './pages/ScanQR';
import Leaderboard from './pages/Leaderboard';
import Prizes from './pages/Prizes';
import History from './pages/History';
import Community from './pages/Community';
import Account from './pages/Account';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import EggGenerate from './pages/admin/EggGenerate';
import EggManage from './pages/admin/EggManage';
import EggExport from './pages/admin/EggExport';
import RedemptionTracking from './pages/admin/RedemptionTracking';
import PrizeManager from './pages/admin/PrizeManager';
import AdminEmail from './pages/admin/AdminEmail';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner large" />
        <p>Loading Egg Hunt...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={user.role === 'adm' ? '/admin' : '/dashboard'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Redeem route — public (landing page handles unauthenticated users) */}
      <Route path="/redeem/:code" element={<Redeem />} />

      {/* Authenticated layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* User routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/prizes" element={<Prizes />} />
        <Route path="/history" element={<History />} />
        <Route path="/community" element={<Community />} />
        <Route path="/account" element={<Account />} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/eggs" element={<ProtectedRoute adminOnly><EggManage /></ProtectedRoute>} />
        <Route path="/admin/eggs/generate" element={<ProtectedRoute adminOnly><EggGenerate /></ProtectedRoute>} />
        <Route path="/admin/eggs/export" element={<ProtectedRoute adminOnly><EggExport /></ProtectedRoute>} />
        <Route path="/admin/redemptions" element={<ProtectedRoute adminOnly><RedemptionTracking /></ProtectedRoute>} />
        <Route path="/admin/prizes" element={<ProtectedRoute adminOnly><PrizeManager /></ProtectedRoute>} />
        <Route path="/admin/email" element={<ProtectedRoute adminOnly><AdminEmail /></ProtectedRoute>} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={user ? (user.role === 'adm' ? '/admin' : '/dashboard') : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
