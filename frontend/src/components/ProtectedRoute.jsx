/**
 * ProtectedRoute — redirects to login if unauthenticated.
 * Optionally checks for admin role.
 * Preserves current location for post-login redirect.
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
        // Preserve redirect target for redemption flow
        localStorage.setItem('redirect_after_login', location.pathname);
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role !== 'adm') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
