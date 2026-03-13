/**
 * Prizes page — shows all prizes with unlock status and progress bars.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { FiLock, FiUnlock } from 'react-icons/fi';

export default function Prizes() {
    const { user } = useAuth();
    const [prizes, setPrizes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/prizes/')
            .then(({ data }) => setPrizes(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h1>🎁 Prizes</h1>
                <p className="subtitle">Earn points to unlock amazing rewards!</p>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : prizes.length === 0 ? (
                <div className="empty-state">
                    <p>No prizes available yet. Keep hunting!</p>
                </div>
            ) : (
                <div className="prizes-grid">
                    {prizes.map((prize) => (
                        <div
                            key={prize.id}
                            className={`prize-card ${prize.is_unlocked ? 'unlocked' : 'locked'}`}
                        >
                            <div className="prize-icon-container">
                                {prize.is_unlocked ? (
                                    <FiUnlock className="prize-icon unlocked-icon" />
                                ) : (
                                    <FiLock className="prize-icon locked-icon" />
                                )}
                            </div>
                            {prize.image && (
                                <img src={prize.image} alt={prize.name} className="prize-image" />
                            )}
                            <h3 className="prize-name">{prize.name}</h3>
                            <p className="prize-description">{prize.description}</p>
                            <div className="prize-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${prize.progress}%` }}
                                    />
                                </div>
                                <span className="progress-text">
                                    {prize.is_unlocked
                                        ? '✅ Unlocked!'
                                        : `${user?.total_points || 0} / ${prize.points_required} pts`
                                    }
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
