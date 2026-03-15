import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { FiLock, FiUnlock } from 'react-icons/fi';

export default function Leaderboard() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [prizes, setPrizes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('leaderboard');

    useEffect(() => {
        Promise.all([
            api.get('/leaderboard/').then(({ data }) => data),
            api.get('/prizes/').then(({ data }) => data.results || data).catch(() => []),
        ])
            .then(([lb, pz]) => {
                setLeaderboard(lb);
                setPrizes(pz);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const getRankDisplay = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return String(rank);
    };

    const isMedalRank = (rank) => rank >= 1 && rank <= 3;
    const userPoints = user?.total_points || 0;

    return (
        <div className="page">
            <div className="page-header">
                <h1>🏆 Leaderboard</h1>
                <p className="subtitle">See who's leading the egg hunt!</p>
            </div>

            <div className="filter-bar">
                <button className={`filter-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
                    Rankings
                </button>
                <button className={`filter-btn ${tab === 'prizes' ? 'active' : ''}`} onClick={() => setTab('prizes')}>
                    Prizes
                </button>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : tab === 'prizes' ? (
                <div className="prizes-info-section">
                    <h2 style={{ marginBottom: '1rem' }}>🎁 Event Prizes</h2>
                    <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Top hunters will receive real prizes at the end of the event!</p>

                    <div className="prize-info-grid">
                        <div className="prize-info-card gold">
                            <span className="prize-info-rank">🥇</span>
                            <div className="prize-info-detail">
                                <span className="prize-info-place">1st Place</span>
                                <span className="prize-info-reward">$100</span>
                            </div>
                        </div>
                        <div className="prize-info-card silver">
                            <span className="prize-info-rank">🥈</span>
                            <div className="prize-info-detail">
                                <span className="prize-info-place">2nd Place</span>
                                <span className="prize-info-reward">$50</span>
                            </div>
                        </div>
                        <div className="prize-info-card bronze">
                            <span className="prize-info-rank">🥉</span>
                            <div className="prize-info-detail">
                                <span className="prize-info-place">3rd Place</span>
                                <span className="prize-info-reward">Lindt Chocolate Bunny</span>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>🌟 Special Categories</h3>
                    <div className="prize-info-grid">
                        <div className="prize-info-card special">
                            <span className="prize-info-rank">🥚</span>
                            <div className="prize-info-detail">
                                <span className="prize-info-place">Most Eggs Collected</span>
                                <span className="prize-info-reward">Bag of Candy</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {leaderboard.length === 0 ? (
                        <div className="empty-state">
                            <p>No hunters yet. Be the first to find an egg!</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Hunter</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className={`${entry.is_current_user ? 'highlight-row' : ''} ${entry.rank <= 3 ? 'top-rank' : ''}`}
                                        >
                                            <td className="rank-cell">
                                                <span className={`rank ${isMedalRank(entry.rank) ? 'rank-medal' : ''}`}>
                                                    {getRankDisplay(entry.rank)}
                                                </span>
                                            </td>
                                            <td className="username-cell">
                                                {entry.username}
                                                {entry.is_current_user && <span className="you-badge">You</span>}
                                            </td>
                                            <td className="points-cell">
                                                <span className="badge badge-points">{entry.total_points} pts</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {prizes.length > 0 && (
                        <div className="leaderboard-prizes">
                            <h2>🎁 Achievement Tiers</h2>
                            <p className="subtitle" style={{ marginBottom: '1rem' }}>Earn points to unlock achievements!</p>
                            <div className="prize-tiers">
                                {prizes.map((prize) => {
                                    const isUnlocked = userPoints >= prize.points_required;
                                    const progress = prize.points_required === 0
                                        ? 100
                                        : Math.min(100, Math.round((userPoints / prize.points_required) * 100));
                                    return (
                                        <div key={prize.id} className={`prize-tier-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                            <div className="prize-tier-icon">
                                                {isUnlocked ? <FiUnlock size={20} /> : <FiLock size={20} />}
                                            </div>
                                            <div className="prize-tier-info">
                                                <span className="prize-tier-name">{prize.name}</span>
                                                <div className="prize-tier-bar">
                                                    <div className="prize-tier-fill" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="prize-tier-status">
                                                    {isUnlocked
                                                        ? '✅ Unlocked!'
                                                        : `${userPoints} / ${prize.points_required} pts`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
