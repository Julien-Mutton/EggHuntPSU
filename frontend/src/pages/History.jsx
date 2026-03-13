/**
 * User redemption history page.
 */

import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function History() {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/user/redemptions/')
            .then(({ data }) => setRedemptions(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const totalEarned = redemptions.reduce((sum, r) => sum + r.points_awarded, 0);

    return (
        <div className="page">
            <div className="page-header">
                <h1>📜 My Egg History</h1>
                <p className="subtitle">All the eggs you've found so far</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card stat-primary">
                    <div className="stat-content">
                        <span className="stat-number">{redemptions.length}</span>
                        <span className="stat-label">Eggs Found</span>
                    </div>
                </div>
                <div className="stat-card stat-secondary">
                    <div className="stat-content">
                        <span className="stat-number">{totalEarned}</span>
                        <span className="stat-label">Points Earned</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : redemptions.length === 0 ? (
                <div className="empty-state">
                    <p>🔍 You haven't found any eggs yet. Start scanning!</p>
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
                            {redemptions.map((r) => (
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
    );
}
