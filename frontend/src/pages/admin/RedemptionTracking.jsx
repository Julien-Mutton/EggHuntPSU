/**
 * Redemption Tracking page — admin audit trail of who got each egg and when.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function RedemptionTracking() {
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/redemptions/?page_size=1000')
            .then(({ data }) => setRedemptions(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h1>📊 Redemption Tracking</h1>
                <p className="subtitle">Complete history of every egg redemption</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card stat-primary">
                    <div className="stat-content">
                        <span className="stat-number">{redemptions.length}</span>
                        <span className="stat-label">Total Redemptions</span>
                    </div>
                </div>
                <div className="stat-card stat-secondary">
                    <div className="stat-content">
                        <span className="stat-number">
                            {redemptions.reduce((sum, r) => sum + r.points_awarded, 0)}
                        </span>
                        <span className="stat-label">Total Points Awarded</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : redemptions.length === 0 ? (
                <div className="empty-state">
                    <p>No redemptions yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Egg</th>
                                <th>Egg Code</th>
                                <th>Points</th>
                                <th>Redeemed At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redemptions.map((r) => (
                                <tr key={r.id}>
                                    <td className="username-cell">{r.username}</td>
                                    <td>{r.egg_title || '—'}</td>
                                    <td className="code-cell">{String(r.egg_code).slice(0, 8)}</td>
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
