/**
 * AuthContext — manages JWT auth state, login, register, logout, and OAuth.
 * Post-login redirect is handled declaratively by PostAuthRedirect in App.jsx.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get('/auth/me/');
            setUser(data);
        } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = async (username, password) => {
        const { data } = await api.post('/auth/login/', { username: username.toLowerCase(), password });
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        await fetchUser();
    };

    const register = async (username, email, password) => {
        const { data } = await api.post('/auth/register/', { username: username.toLowerCase(), email, password });
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
        setUser(data.user);
    };

    const socialLogin = async (accessToken, provider) => {
        const endpoint = provider === 'microsoft-graph' ? '/auth/social/microsoft/' : '/auth/social/google/';
        const { data } = await api.post(endpoint, {
            access_token: accessToken,
            provider: provider || 'google-oauth2',
        });
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, socialLogin, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
