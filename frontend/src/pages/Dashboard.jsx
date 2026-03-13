/**
 * User Dashboard — shows total points, recent eggs, and quick actions.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { FiAward, FiBarChart2, FiClock, FiCamera } from 'react-icons/fi';
import WelcomeModal from '../components/WelcomeModal';

export default function Dashboard() {
    const { user } = useAuth();
    const [recentRedemptions, setRecentRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('egghunt_welcomed')) {
            setShowWelcome(true);
        }
    }, []);

    useEffect(() => {
        api.get('/user/redemptions/').then(({ data }) => {
            setRecentRedemptions((data.results || data).slice(0, 5));
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const dismissWelcome = () => {
        localStorage.setItem('egghunt_welcomed', 'true');
        setShowWelcome(false);
    };

    if (showWelcome) {
        return <WelcomeModal onDismiss={dismissWelcome} />;
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>Welcome, {user?.username}! 🎉</h1>
                <p className="subtitle">Keep searching for eggs to earn points and unlock prizes!</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card stat-primary">
                    <FiAward className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-number">{user?.total_points || 0}</span>
                        <span className="stat-label">Total Points</span>
                    </div>
                </div>
                <div className="stat-card stat-secondary">
                    <FiClock className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-number">{recentRedemptions.length}</span>
                        <span className="stat-label">Recent Finds</span>
                    </div>
                </div>
                <div className="stat-card stat-accent">
                    <FiCamera className="stat-icon" />
                    <div className="stat-content">
                        <Link to="/scan" className="stat-link">Scan QR Code →</Link>
                        <span className="stat-label">Find eggs nearby</span>
                    </div>
                </div>
                <div className="stat-card stat-success">
                    <FiBarChart2 className="stat-icon" />
                    <div className="stat-content">
                        <Link to="/leaderboard" className="stat-link">View Leaderboard →</Link>
                        <span className="stat-label">Check your rank</span>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Recent Finds</h2>
                {loading ? (
                    <div className="loading-inline"><div className="spinner" /></div>
                ) : recentRedemptions.length === 0 ? (
                    <div className="empty-state">
                        <p>🔍 No eggs found yet. Scan a QR code to get started!</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Egg</th>
                                    <th>Points</th>
                                    <th>Found At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRedemptions.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.egg_title || `Egg #${r.egg}`}</td>
                                        <td><span className="badge badge-success">+{r.points_awarded}</span></td>
                                        <td>{new Date(r.redeemed_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
