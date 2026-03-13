/**
 * Registration page with optional Google OAuth.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginWithMicrosoft } from '../lib/msal';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Register() {
    const { register, socialLogin } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSuccess = async (tokenResponse) => {
        setError('');
        setLoading(true);
        try {
            await socialLogin(tokenResponse.access_token, 'google-oauth2');
        } catch (err) {
            setError(err.response?.data?.error || 'Google sign-up failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPass) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await register(username, email, password);
        } catch (err) {
            const data = err.response?.data;
            if (data) {
                const messages = Object.values(data).flat().join(' ');
                setError(messages || 'Registration failed.');
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const showGoogleAuth = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const showMicrosoftAuth = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

    const handleMicrosoftLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const token = await loginWithMicrosoft();
            await socialLogin(token, 'microsoft-graph');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Microsoft sign-up failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-emoji">🐣</span>
                    <h1>Join the Hunt!</h1>
                    <p>Create an account to start finding eggs</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPass">Confirm Password</label>
                        <input id="confirmPass" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Repeat your password" required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                {(showGoogleAuth || showMicrosoftAuth) && (
                    <>
                        <div className="auth-divider">
                            <span>or</span>
                        </div>
                        {showGoogleAuth && (
                            <GoogleSignInButton
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Google sign-up was cancelled or failed.')}
                                disabled={loading}
                                label="Sign up with Google"
                            />
                        )}
                        {showMicrosoftAuth && (
                            <button
                                type="button"
                                className="btn btn-outline btn-full"
                                onClick={handleMicrosoftLogin}
                                disabled={loading}
                            >
                                Sign up with Microsoft
                            </button>
                        )}
                    </>
                )}

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Log in</Link></p>
                </div>

                <div className="auth-sponsors" style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sponsored By</p>
                    <a href="https://linktr.ee/TheGlobalEngagementCommunity" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                        <img 
                            src="/GEC_logo.png" 
                            alt="The Global Engagement Community" 
                            style={{ width: '120px', height: 'auto', display: 'block', margin: '0 auto', opacity: 0.85, transition: 'opacity 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.85}
                        />
                    </a>
                </div>
            </div>
        </div>
    );
}
