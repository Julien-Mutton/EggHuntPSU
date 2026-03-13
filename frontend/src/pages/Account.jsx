import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { FiLogOut } from 'react-icons/fi';

export default function Account() {
    const { user, logout, fetchUser } = useAuth();
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [pwOld, setPwOld] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');

    useEffect(() => {
        setEmail(user?.email || '');
    }, [user?.email]);

    useEffect(() => {
        api.get('/user/redemptions/')
            .then(({ data }) => setRedemptions(data.results || data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const totalEarned = redemptions.reduce((sum, r) => sum + r.points_awarded, 0);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailError('');
        setEmailSuccess(false);
        if (!email.trim()) return;
        setEmailLoading(true);
        try {
            await api.patch('/auth/me/', { email: email.trim() });
            await fetchUser();
            setEmailSuccess(true);
        } catch (err) {
            const d = err.response?.data;
            setEmailError(d?.email?.[0] || d?.detail || 'Failed to update email.');
        } finally {
            setEmailLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwError('');
        if (pwNew !== pwConfirm) {
            setPwError('New passwords do not match.');
            return;
        }
        setPwLoading(true);
        try {
            const { data } = await api.post('/auth/change-password/', {
                old_password: pwOld,
                new_password: pwNew,
            });
            localStorage.setItem('access_token', data.tokens.access);
            localStorage.setItem('refresh_token', data.tokens.refresh);
            await fetchUser();
            setPwOld('');
            setPwNew('');
            setPwConfirm('');
        } catch (err) {
            const d = err.response?.data;
            setPwError(d?.old_password?.[0] || d?.new_password?.[0] || d?.detail || 'Failed to change password.');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="account-header">
                <div className="account-avatar">
                    {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="account-info">
                    <h1>{user?.username}</h1>
                    <p>{user?.email}</p>
                    <div className="account-meta">
                        <span>{user?.role === 'adm' ? 'Admin' : 'Player'}</span>
                        <span>Joined {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}</span>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card stat-primary">
                    <div className="stat-content">
                        <span className="stat-number">{user?.total_points || 0}</span>
                        <span className="stat-label">Total Points</span>
                    </div>
                </div>
                <div className="stat-card stat-accent">
                    <div className="stat-content">
                        <span className="stat-number">{redemptions.length}</span>
                        <span className="stat-label">Eggs Redeemed</span>
                    </div>
                </div>
                <div className="stat-card stat-success">
                    <div className="stat-content">
                        <span className="stat-number">{totalEarned}</span>
                        <span className="stat-label">Points Earned</span>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Update Email</h2>
                <form onSubmit={handleEmailSubmit} className="form-card" style={{ maxWidth: '400px' }}>
                    <div className="form-group">
                        <label htmlFor="account-email">Email</label>
                        <input id="account-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    {emailError && <div className="alert alert-error">{emailError}</div>}
                    {emailSuccess && <div className="alert alert-success">Email updated successfully.</div>}
                    <button type="submit" className="btn btn-primary" disabled={emailLoading}>
                        {emailLoading ? 'Saving...' : 'Update Email'}
                    </button>
                </form>
            </div>

            <div className="section">
                <h2>Change Password</h2>
                <form onSubmit={handlePasswordSubmit} className="form-card" style={{ maxWidth: '400px' }}>
                    <div className="form-group">
                        <label htmlFor="account-pw-old">Current Password</label>
                        <input id="account-pw-old" type="password" value={pwOld} onChange={e => setPwOld(e.target.value)} placeholder="Enter current password" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="account-pw-new">New Password</label>
                        <input id="account-pw-new" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="account-pw-confirm">Confirm New Password</label>
                        <input id="account-pw-confirm" type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat new password" required minLength={6} />
                    </div>
                    {pwError && <div className="alert alert-error">{pwError}</div>}
                    <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                        {pwLoading ? 'Updating...' : 'Change Password'}
                    </button>
                </form>
            </div>

            <div className="section">
                <h2>Redemption History</h2>
                {loading ? (
                    <div className="loading-inline"><div className="spinner" /></div>
                ) : redemptions.length === 0 ? (
                    <div className="empty-state"><p>No eggs redeemed yet. Start scanning!</p></div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Egg</th>
                                    <th>Points</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {redemptions.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.egg_title || r.egg_code?.slice(0, 8) || '—'}</td>
                                        <td><span className="badge badge-points">+{r.points_awarded}</span></td>
                                        <td>{new Date(r.redeemed_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="section" style={{ marginTop: '2rem' }}>
                <button className="btn btn-danger" onClick={logout}>
                    <FiLogOut /> Logout
                </button>
            </div>
        </div>
    );
}
