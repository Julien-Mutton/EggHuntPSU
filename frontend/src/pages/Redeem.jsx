import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { FaWhatsapp, FaInstagram, FaDiscord, FaFacebookF, FaLink } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FiUsers, FiExternalLink } from 'react-icons/fi';
import { SiLinktree } from 'react-icons/si';

const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const RARITY_CONFIG = {
    common:    { emoji: '🥚', label: 'Common',    color: '#A7A9BE', glow: 'rgba(167, 169, 190, 0.2)' },
    uncommon:  { emoji: '🌟', label: 'Uncommon',  color: '#55EFC4', glow: 'rgba(85, 239, 196, 0.25)' },
    rare:      { emoji: '💎', label: 'Rare',      color: '#A29BFE', glow: 'rgba(162, 155, 254, 0.3)' },
    legendary: { emoji: '🔥', label: 'Legendary', color: '#FDCB6E', glow: 'rgba(253, 203, 110, 0.35)' },
};

const LINK_ICONS = {
    whatsapp:  { icon: FaWhatsapp,   color: '#25D366' },
    instagram: { icon: FaInstagram,  color: '#E1306C' },
    discord:   { icon: FaDiscord,    color: '#5865F2' },
    twitter:   { icon: FaXTwitter,   color: '#1DA1F2' },
    facebook:  { icon: FaFacebookF,  color: '#1877F2' },
    linktree:  { icon: SiLinktree,   color: '#43E660' },
    groupme:   { icon: FiUsers,      color: '#00AFF0' },
    link:      { icon: FaLink,       color: '#A29BFE' },
};

function getLinkIcon(iconKey) {
    const cfg = LINK_ICONS[iconKey] || LINK_ICONS.link;
    const Icon = cfg.icon;
    return <Icon size={18} color={cfg.color} />;
}

/**
 * Normalize a YouTube URL to an embeddable format.
 * Handles: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
 */
function normalizeVideoUrl(url) {
    if (!url) return null;
    // Already an embed URL
    if (url.includes('/embed/')) return url;

    let videoId = null;

    // Standard: youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) videoId = watchMatch[1];

    // Short: youtu.be/VIDEO_ID
    if (!videoId) {
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (shortMatch) videoId = shortMatch[1];
    }

    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
    // Not a recognized YouTube URL, return as-is for other embeds
    return url;
}

function ConfettiEffect() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#6C5CE7', '#A29BFE', '#FDCB6E', '#55EFC4', '#FF7675', '#00B894', '#E17055'];
        const particles = [];
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 4,
                h: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: Math.random() * 2 - 1,
                rotation: Math.random() * 360,
                spin: Math.random() * 6 - 3,
                opacity: 1,
            });
        }

        let frame;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let allDone = true;
            particles.forEach(p => {
                if (p.y < canvas.height + 20) allDone = false;
                p.y += p.vy;
                p.x += p.vx;
                p.rotation += p.spin;
                p.opacity = Math.max(0, 1 - p.y / canvas.height);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (!allDone) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, []);

    return <canvas ref={canvasRef} className="confetti-canvas" />;
}

/**
 * Landing page shown to unauthenticated users who scan a QR code.
 */
function RedeemLanding({ code }) {
    const navigate = useNavigate();
    const redirect = encodeURIComponent(`/redeem/${code}`);

    const handleLogin = () => {
        navigate(`/login?redirect=${redirect}`);
    };

    const handleRegister = () => {
        navigate(`/register?redirect=${redirect}`);
    };

    return (
        <div className="redeem-page">
            <div className="redeem-card landing-state">
                <span className="redeem-emoji bounce">🥚✨</span>
                <h1 className="redeem-title">You Found an Egg!</h1>
                <p className="redeem-subtitle" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    You've scanned an <strong>Egg Hunt</strong> QR code — a campus-wide scavenger hunt where you find hidden eggs to earn points and win prizes!
                </p>

                <div className="landing-steps">
                    <div className="landing-step">
                        <span className="step-num">1</span>
                        <span>Log in or create a free account</span>
                    </div>
                    <div className="landing-step">
                        <span className="step-num">2</span>
                        <span>The egg will be <strong>automatically redeemed</strong></span>
                    </div>
                    <div className="landing-step">
                        <span className="step-num">3</span>
                        <span>Earn points, climb the leaderboard, and unlock prizes!</span>
                    </div>
                </div>

                <div className="landing-actions">
                    <button className="btn btn-primary btn-full" onClick={handleLogin}>
                        Log In
                    </button>
                    <button className="btn btn-outline btn-full" onClick={handleRegister}>
                        Create Account
                    </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                    No need to re-scan — your egg code is saved.
                </p>
            </div>
        </div>
    );
}

export default function Redeem() {
    const { code } = useParams();
    const { user, fetchUser } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [communityLinks, setCommunityLinks] = useState([]);
    const [claimFeedback, setClaimFeedback] = useState({});
    const [claimingLinkId, setClaimingLinkId] = useState(null);

    // If user is not authenticated, show landing page
    if (!user) {
        return <RedeemLanding code={code} />;
    }

    /* eslint-disable react-hooks/rules-of-hooks */

    useEffect(() => {
        api.get('/community-links/')
            .then(({ data }) => setCommunityLinks(data.results || data))
            .catch(() => {});
    }, []);

    const isRedeeming = useRef(false);

    useEffect(() => {
        if (!code || isRedeeming.current || !user) return;
        isRedeeming.current = true;

        (async () => {
            try {
                const { data } = await api.post(`/redeem/${code}/`);
                setResult(data);
                await fetchUser();
            } catch (err) {
                if (err.response?.data) {
                    setResult(err.response.data);
                } else {
                    setError('Network error. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [code, fetchUser, user]);

    /* eslint-enable react-hooks/rules-of-hooks */

    const handleClaimLink = async (link) => {
        if (!link.id || (link.extra_points ?? 0) <= 0 || claimingLinkId) return;
        setClaimingLinkId(link.id);
        setClaimFeedback(prev => {
            const next = { ...prev };
            delete next[link.id];
            return next;
        });
        try {
            const { data } = await api.post(`/global-links/${link.id}/claim/`);
            if (data.points_awarded > 0) {
                setClaimFeedback(prev => ({ ...prev, [link.id]: data.points_awarded }));
                await fetchUser();
                setTimeout(() => setClaimFeedback(prev => { const n = { ...prev }; delete n[link.id]; return n; }), 2500);
            }
            if (data.redirect_url) {
                window.open(data.redirect_url, '_blank', 'noopener,noreferrer');
            }
        } catch {
            setClaimFeedback(prev => ({ ...prev, [link.id]: 'error' }));
        } finally {
            setClaimingLinkId(null);
        }
    };

    if (loading) {
        return (
            <div className="redeem-page">
                <div className="redeem-card loading-state">
                    <div className="spinner large" />
                    <h2>Scanning egg...</h2>
                    <p>Please wait while we verify this QR code</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="redeem-page">
                <div className="redeem-card error-state">
                    <span className="redeem-emoji">❌</span>
                    <h2>Something Went Wrong</h2>
                    <p>{error}</p>
                    <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                </div>
            </div>
        );
    }

    if (!result) return null;

    const rarity = RARITY_CONFIG[result.rarity] || RARITY_CONFIG.common;
    const rewardLinks = result.reward_links?.length > 0 ? result.reward_links : communityLinks;
    const hasLinks = rewardLinks.length > 0;
    const embedUrl = normalizeVideoUrl(result.video_url);

    // Backend domain for media URLs
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

    if (result.success) {
        return (
            <div className="redeem-page">
                <ConfettiEffect />
                <div className={`redeem-card success-state rarity-${result.rarity}`} style={{ '--rarity-glow': rarity.glow, '--rarity-color': rarity.color }}>
                    <div className="rarity-badge" style={{ background: rarity.color }}>{rarity.label}</div>

                    <h1 className="redeem-title">
                        {result.points_earned > 0 ? 'Egg Found!' : 'Already Claimed!'}
                    </h1>
                    <p className="redeem-subtitle">
                        {result.points_earned > 0 
                            ? result.egg_title 
                            : `You've already found: ${result.egg_title}`}
                    </p>

                    {result.is_rickroll ? (
                        <div className="redeem-media">
                            <video
                                id="rickroll-video"
                                src={`${backendUrl}/media/rickroll.mp4`}
                                autoPlay
                                controls
                                playsInline
                                style={{ width: '100%', borderRadius: 'var(--radius)', display: 'block', backgroundColor: '#000' }}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ) : result.custom_video_url ? (
                        <div className="redeem-media">
                            <video
                                src={result.custom_video_url}
                                autoPlay
                                controls
                                playsInline
                                style={{ width: '100%', borderRadius: 'var(--radius)', display: 'block', backgroundColor: '#000' }}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ) : embedUrl ? (
                        <div className="redeem-media">
                            <div className="video-wrapper">
                                <iframe
                                    src={embedUrl}
                                    title="Reward Video"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    ) : result.show_gif && result.gif_url ? (
                        <div className="redeem-media">
                            <img src={result.gif_url} alt="Reward animation" className="redeem-gif-img" />
                        </div>
                    ) : (
                        <span className="redeem-emoji bounce">{rarity.emoji}</span>
                    )}

                    {result.reward_message && (
                        <div className="reward-message"><p>{result.reward_message}</p></div>
                    )}

                    <div className="redeem-points">
                        <div className="points-earned">
                            <span className="points-value">+{result.points_earned}</span>
                            <span className="points-label">Points Earned</span>
                        </div>
                        <div className="points-divider" />
                        <div className="points-total">
                            <span className="points-value">{result.total_points}</span>
                            <span className="points-label">Total Points</span>
                        </div>
                    </div>

                    {hasLinks && (
                        <div className="redeem-linktree">
                            <h3 className="linktree-heading">
                                {result.reward_links?.length > 0 ? 'Your Rewards' : 'Join the Community'}
                            </h3>
                            <div className="linktree-links">
                                {rewardLinks.map(link => {
                                    const extraPts = link.extra_points ?? 0;
                                    const hasClaim = extraPts > 0 && link.id;
                                    const alreadyClaimed = !!link.already_claimed;
                                    if (hasClaim) {
                                        const isLoading = claimingLinkId === link.id;
                                        const ptsAwarded = typeof claimFeedback[link.id] === 'number' ? claimFeedback[link.id] : null;
                                        const hasError = claimFeedback[link.id] === 'error';
                                        let label = link.name || 'Visit';
                                        if (isLoading) label = 'Claiming...';
                                        else if (ptsAwarded != null) label = link.name || 'Visit';
                                        else if (alreadyClaimed) label = `${link.name} (Claimed)`;
                                        else if (extraPts > 0) label = `${link.name} — Earn ${extraPts} pts`;
                                        return (
                                            <button
                                                key={link.id}
                                                type="button"
                                                className="linktree-btn"
                                                disabled={isLoading}
                                                onClick={() => handleClaimLink(link)}
                                            >
                                                <span className="linktree-btn-icon">{getLinkIcon(link.icon)}</span>
                                                <span className="linktree-btn-label">{label}</span>
                                                {ptsAwarded != null && ptsAwarded > 0 && (
                                                    <span className="linktree-feedback">+{ptsAwarded} pts earned!</span>
                                                )}
                                                {hasError && <span className="linktree-feedback error">Claim failed</span>}
                                                <FiExternalLink size={14} className="linktree-btn-arrow" />
                                            </button>
                                        );
                                    }
                                    return (
                                        <a key={link.id || link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="linktree-btn" aria-label={link.name || 'Visit'}>
                                            <span className="linktree-btn-icon">{getLinkIcon(link.icon)}</span>
                                            <span className="linktree-btn-label">{link.name || 'Visit'}</span>
                                            <FiExternalLink size={14} className="linktree-btn-arrow" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="recycle-notice" style={{ margin: '1.5rem 0 0', padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        ♻️ If you find an egg on campus, whether it has been claimed or not, please throw the egg in a recycling trash can if possible afterwards.
                    </div>

                    <div className="redeem-actions">
                        <Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="redeem-page">
            <div className="redeem-card failure-state">
                <span className="redeem-emoji">😔</span>
                <h2>Oops!</h2>
                <p className="redeem-message">{result.message}</p>
                {result.egg_title && <p className="redeem-subtitle">{result.egg_title}</p>}
                <div className="redeem-actions">
                    <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                    <Link to="/leaderboard" className="btn btn-secondary">View Leaderboard</Link>
                </div>
            </div>
        </div>
    );
}
