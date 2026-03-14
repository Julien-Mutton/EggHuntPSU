import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'legendary'];
const ICON_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'groupme', label: 'GroupMe' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linktree', label: 'Linktree' },
    { value: 'discord', label: 'Discord' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'link', label: 'Generic Link' },
];

export default function EggGenerate() {
    const [form, setForm] = useState({
        count: 5,
        points: 10,
        title: '',
        label_text: '',
        rarity: 'common',
        reward_message: '',
        video_url: '',
        local_video_path: '',
        show_gif: false,
        gif_url: '',
        is_rickroll: false,
    });
    const [links, setLinks] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableVideos, setAvailableVideos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/eggs/videos/')
            .then(({ data }) => setAvailableVideos(data.videos || []))
            .catch(() => {})
            .finally(() => setVideosLoading(false));
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
        }));
    };

    const addLink = () => {
        setLinks(prev => [...prev, { name: '', url: '', icon: '', order: prev.length, extra_points: 0, is_unique_per_user: false }]);
    };

    const removeLink = (idx) => {
        setLinks(prev => prev.filter((_, i) => i !== idx));
    };

    const handleLinkChange = (idx, field, value) => {
        setLinks(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setLoading(true);
        const payload = {
            ...form,
            links: links.filter(l => l.name.trim() && l.url.trim()).map(l => ({
                name: l.name,
                url: l.url,
                icon: l.icon || '',
                order: l.order ?? 0,
                extra_points: Math.max(0, l.extra_points ?? 0),
                is_unique_per_user: !!l.is_unique_per_user,
            })),
        };
        try {
            const { data } = await api.post('/admin/eggs/generate/', payload);
            setResult(data);
        } catch (err) {
            const d = err.response?.data;
            if (d && typeof d === 'object' && !d.detail) {
                const msgs = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
                setError(msgs.join(' | '));
            } else {
                setError(d?.detail || 'Failed to generate eggs.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Generate Eggs</h1>
                <p className="subtitle">Create new QR code eggs for the hunt</p>
            </div>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    {/* ── Core Settings ─────────────────────────── */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="count">Number of Eggs</label>
                            <input id="count" name="count" type="number" min="1" max="10000" value={form.count} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="points">Points Per Egg</label>
                            <input id="points" name="points" type="number" min="1" value={form.points} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="rarity">Rarity</label>
                            <select id="rarity" name="rarity" value={form.rarity} onChange={handleChange}>
                                {RARITY_OPTIONS.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="title">Egg Title</label>
                        <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="e.g., Golden Egg" />
                        <small className="form-hint">Optional display name shown to the user on redemption.</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="label_text">QR Label Text</label>
                        <input id="label_text" name="label_text" type="text" value={form.label_text} onChange={handleChange} placeholder="e.g., SPECIAL EGG" />
                        <small className="form-hint">Printed above the QR code on exported PDF sheets.</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reward_message">Reward Message</label>
                        <textarea id="reward_message" name="reward_message" value={form.reward_message} onChange={handleChange} rows="2" placeholder="Custom message shown to user upon redemption" />
                        <small className="form-hint">Displayed in a highlighted box on the redemption screen.</small>
                    </div>

                    {/* ── Media Settings ────────────────────────── */}
                    <hr className="section-divider" />

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="video_url">Video Embed URL</label>
                            <input id="video_url" name="video_url" type="url" value={form.video_url} onChange={handleChange} placeholder="https://youtube.com/embed/..." />
                            <small className="form-hint">YouTube/Vimeo embed link. Takes priority over GIF.</small>
                        </div>
                        <div className="form-group">
                            <label htmlFor="local_video_path">Local Video</label>
                            {videosLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                                    <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading videos...</span>
                                </div>
                            ) : (
                                <>
                                    <select id="local_video_path" name="local_video_path" value={form.local_video_path} onChange={handleChange}>
                                        <option value="">-- None --</option>
                                        {availableVideos.map((vid) => (
                                            <option key={vid.path} value={vid.path}>{vid.name}</option>
                                        ))}
                                    </select>
                                    {availableVideos.length === 0 && (
                                        <small className="form-hint">No videos found in media/egg_videos/</small>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group checkbox-group">
                            <label>
                                <input type="checkbox" name="show_gif" checked={form.show_gif} onChange={handleChange} />
                                Show GIF after redemption
                            </label>
                        </div>
                        <div className="form-group checkbox-group">
                            <label>
                                <input type="checkbox" name="is_rickroll" checked={form.is_rickroll} onChange={handleChange} />
                                Rick Roll mode
                            </label>
                        </div>
                    </div>

                    {form.show_gif && (
                        <div className="form-group">
                            <label htmlFor="gif_url">GIF URL</label>
                            <input id="gif_url" name="gif_url" type="url" value={form.gif_url} onChange={handleChange} placeholder="https://media.giphy.com/..." />
                            <small className="form-hint">Displayed on the redemption success screen when no video is set.</small>
                        </div>
                    )}

                    {/* ── Reward Links ──────────────────────────── */}
                    <hr className="section-divider" />

                    <div className="links-section">
                        <div className="links-header">
                            <div>
                                <h3>Reward Links</h3>
                                <small className="form-hint" style={{ fontWeight: 'normal' }}>Links shown on the redemption screen. Can optionally grant bonus points.</small>
                            </div>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={addLink}>
                                <FiPlus /> Add Link
                            </button>
                        </div>

                        {links.length > 0 && (
                            <div className="link-grid-header">
                                <span className="link-col-label link-col-name">Name</span>
                                <span className="link-col-label link-col-url">URL</span>
                                <span className="link-col-label link-col-icon">Icon</span>
                                <span className="link-col-label link-col-order">Order</span>
                                <span className="link-col-label link-col-pts">Bonus Pts</span>
                                <span className="link-col-label link-col-unique">Once</span>
                                <span className="link-col-label link-col-actions"></span>
                            </div>
                        )}

                        {links.map((link, idx) => (
                            <div key={idx} className="link-row">
                                <input
                                    className="link-col-name"
                                    value={link.name}
                                    onChange={e => handleLinkChange(idx, 'name', e.target.value)}
                                    placeholder="Link name"
                                    aria-label="Link name"
                                />
                                <input
                                    className="link-col-url"
                                    value={link.url}
                                    onChange={e => handleLinkChange(idx, 'url', e.target.value)}
                                    placeholder="https://..."
                                    aria-label="Link URL"
                                />
                                <select
                                    className="link-col-icon"
                                    value={link.icon || ''}
                                    onChange={e => handleLinkChange(idx, 'icon', e.target.value)}
                                    aria-label="Icon type"
                                >
                                    {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <input
                                    className="link-col-order"
                                    type="number"
                                    value={link.order ?? idx}
                                    onChange={e => handleLinkChange(idx, 'order', parseInt(e.target.value) || 0)}
                                    aria-label="Display order"
                                />
                                <input
                                    className="link-col-pts"
                                    type="number"
                                    min="0"
                                    value={link.extra_points ?? 0}
                                    onChange={e => handleLinkChange(idx, 'extra_points', parseInt(e.target.value) || 0)}
                                    aria-label="Bonus points"
                                />
                                <label className="link-col-unique link-checkbox" title="Each user can earn points from this link at most once">
                                    <input
                                        type="checkbox"
                                        checked={!!link.is_unique_per_user}
                                        onChange={e => handleLinkChange(idx, 'is_unique_per_user', e.target.checked)}
                                    />
                                    <span>1x</span>
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger link-col-actions"
                                    onClick={() => removeLink(idx)}
                                    aria-label="Remove link"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}

                        {links.length === 0 && (
                            <p className="text-muted" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>
                                No reward links. Click "Add Link" to attach links that appear when users redeem these eggs.
                            </p>
                        )}
                    </div>

                    {/* ── Submit ────────────────────────────────── */}
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
                        {loading && <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff', marginRight: '0.5rem' }} />}
                        {loading ? 'Generating...' : `Generate ${form.count} Egg${form.count !== 1 ? 's' : ''}`}
                    </button>
                </form>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
                <div className="section">
                    <div className="alert alert-success">
                        Successfully created {result.created} egg{result.created !== 1 ? 's' : ''}!
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Title</th>
                                    <th>Rarity</th>
                                    <th>Points</th>
                                    <th>Links</th>
                                    <th>QR URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.eggs.map((egg) => (
                                    <tr key={egg.id}>
                                        <td className="code-cell">{String(egg.code_identifier).slice(0, 8)}</td>
                                        <td>{egg.title || '—'}</td>
                                        <td><span className={`badge badge-${egg.rarity}`}>{egg.rarity}</span></td>
                                        <td>{egg.points}</td>
                                        <td>{(egg.reward_links || []).length}</td>
                                        <td><a href={egg.qr_url} target="_blank" rel="noreferrer" className="link">Open</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
