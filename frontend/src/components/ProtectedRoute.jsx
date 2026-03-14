/**
 * ProtectedRoute — redirects to login if unauthenticated.
 * Optionally checks for admin role.
 * Preserves current path as ?redirect= query param for post-login redirect.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        const redirect = encodeURIComponent(location.pathname);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (adminOnly && user.role !== 'adm') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
