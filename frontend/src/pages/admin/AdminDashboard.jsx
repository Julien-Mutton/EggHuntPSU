/**
 * Admin Dashboard — overview of egg hunt status.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { FiPackage, FiCheckCircle, FiGift } from 'react-icons/fi';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total: 0, redeemed: 0, unclaimed: 0 });
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        api.get('/admin/eggs/?page_size=10000')
            .then(({ data }) => {
                const eggs = data.results || data;
                const redeemed = eggs.filter(e => e.is_redeemed).length;
                setStats({
                    total: eggs.length,
                    redeemed,
                    unclaimed: eggs.length - redeemed,
                });
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page">
                <div className="loading-inline"><div className="spinner" /></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>🛠️ Admin Dashboard</h1>
                <p className="subtitle">Manage your egg hunt event</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card stat-primary">
                    <FiPackage className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-number">{stats.total}</span>
                        <span className="stat-label">Total Eggs</span>
                    </div>
                </div>
                <div className="stat-card stat-success">
                    <FiCheckCircle className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-number">{stats.redeemed}</span>
                        <span className="stat-label">Redeemed</span>
                    </div>
                </div>
                <div className="stat-card stat-warning">
                    <FiGift className="stat-icon" />
                    <div className="stat-content">
                        <span className="stat-number">{stats.unclaimed}</span>
                        <span className="stat-label">Unclaimed</span>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2>Quick Actions</h2>
                <div className="action-grid">
                    <Link to="/admin/eggs/generate" className="action-card">
                        <span className="action-emoji">🥚</span>
                        <h3>Generate Eggs</h3>
                        <p>Create new QR code eggs</p>
                    </Link>
                    <Link to="/admin/eggs" className="action-card">
                        <span className="action-emoji">📋</span>
                        <h3>Manage Eggs</h3>
                        <p>View and edit all eggs</p>
                    </Link>
                    <Link to="/admin/eggs/export" className="action-card">
                        <span className="action-emoji">🖨️</span>
                        <h3>Export QR Codes</h3>
                        <p>Download printable PDFs</p>
                    </Link>
                    <Link to="/admin/redemptions" className="action-card">
                        <span className="action-emoji">📊</span>
                        <h3>Redemptions</h3>
                        <p>Track who found what</p>
                    </Link>
                    <Link to="/admin/achievements" className="action-card">
                        <span className="action-emoji">🏆</span>
                        <h3>Manage Achievements</h3>
                        <p>Create and edit achievements</p>
                    </Link>
                    <Link to="/leaderboard" className="action-card">
                        <span className="action-emoji">📈</span>
                        <h3>Leaderboard</h3>
                        <p>View rankings</p>
                    </Link>
                    <Link to="/admin/email" className="action-card">
                        <span className="action-emoji">📧</span>
                        <h3>Send Email</h3>
                        <p>Message participants</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
