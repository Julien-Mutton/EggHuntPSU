/**
 * Community page — shows club and social media links.
 */

import { useState, useEffect } from 'react';
import api from '../api/axios';

const ICON_EMOJIS = {
    whatsapp: '💬',
    groupme: '👥',
    instagram: '📸',
    linktree: '🌳',
    discord: '🎮',
    twitter: '🐦',
    facebook: '📘',
    link: '🔗',
};

const ICON_COLORS = {
    whatsapp: '#25D366',
    groupme: '#00AFF0',
    instagram: '#E4405F',
    linktree: '#43E55E',
    discord: '#5865F2',
    twitter: '#1DA1F2',
    facebook: '#1877F2',
    link: '#6C5CE7',
};

export default function Community() {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/community-links/')
            .then(({ data }) => setLinks(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page-header">
                <h1>🤝 Community</h1>
                <p className="subtitle">Connect with fellow egg hunters and stay updated!</p>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : links.length === 0 ? (
                <div className="empty-state">
                    <p>No community links available yet. Check back later!</p>
                </div>
            ) : (
                <div className="community-grid">
                    {links.map(link => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="community-card"
                            style={{ '--link-color': ICON_COLORS[link.icon] || '#6C5CE7' }}
                        >
                            <span className="community-card-icon" style={{ background: ICON_COLORS[link.icon] || '#6C5CE7' }}>
                                {ICON_EMOJIS[link.icon] || '🔗'}
                            </span>
                            <div className="community-card-info">
                                <h3>{link.name}</h3>
                                {link.description && <p>{link.description}</p>}
                            </div>
                            <span className="community-card-arrow">→</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
