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


    useEffect(() => {
        api.get('/admin/eggs/videos/')
            .then(({ data }) => setAvailableVideos(data.videos || []))
            .catch(() => console.error("Could not load local videos"));
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
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="count">Number of Eggs</label>
                            <input id="count" name="count" type="number" min="1" max="10000" value={form.count} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="points">Points Per Egg</label>
                            <input id="points" name="points" type="number" min="1" value={form.points} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="title">Egg Title (optional)</label>
                        <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="e.g., Golden Egg" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="label_text">Label Text (printed above QR code)</label>
                        <input id="label_text" name="label_text" type="text" value={form.label_text} onChange={handleChange} placeholder="e.g., SPECIAL EGG" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="rarity">Rarity</label>
                            <select id="rarity" name="rarity" value={form.rarity} onChange={handleChange}>
                                {RARITY_OPTIONS.map(r => (
                                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="video_url">Video Embed URL (optional)</label>
                            <input id="video_url" name="video_url" type="url" value={form.video_url} onChange={handleChange} placeholder="https://youtube.com/embed/..." />
                        </div>
                        <div className="form-group">
                            <label htmlFor="local_video_path">Local Video Path (optional)</label>
                            <select id="local_video_path" name="local_video_path" value={form.local_video_path} onChange={handleChange}>
                                <option value="">-- None --</option>
                                {availableVideos.map((vid) => (
                                    <option key={vid.path} value={vid.path}>{vid.name}</option>
                                ))}
                            </select>
                            {availableVideos.length === 0 && (
                                <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>No videos found in media/egg_videos/</small>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reward_message">Reward Message (optional)</label>
                        <textarea id="reward_message" name="reward_message" value={form.reward_message} onChange={handleChange} rows="2" placeholder="Custom message shown to user upon redemption" />
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input type="checkbox" name="show_gif" checked={form.show_gif} onChange={handleChange} />
                            Show GIF after redemption
                        </label>
                    </div>

                    {form.show_gif && (
                        <div className="form-group">
                            <label htmlFor="gif_url">GIF URL</label>
                            <input id="gif_url" name="gif_url" type="url" value={form.gif_url} onChange={handleChange} placeholder="https://media.giphy.com/..." />
                        </div>
                    )}

                    <div className="form-group checkbox-group">
                        <label>
                            <input type="checkbox" name="is_rickroll" checked={form.is_rickroll} onChange={handleChange} />
                            🎵 Rick Roll (redirects user after redemption)
                        </label>
                    </div>

                    <div className="links-section" style={{ marginTop: '1.5rem' }}>
                        <div className="links-header">
                            <h3>Reward Links (optional)</h3>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={addLink}><FiPlus /> Add Link</button>
                        </div>
                        {links.map((link, idx) => (
                            <div key={idx} className="link-row">
                                <input value={link.name} onChange={e => handleLinkChange(idx, 'name', e.target.value)} placeholder="Link name" />
                                <input value={link.url} onChange={e => handleLinkChange(idx, 'url', e.target.value)} placeholder="https://..." />
                                <select value={link.icon || ''} onChange={e => handleLinkChange(idx, 'icon', e.target.value)}>
                                    {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <input type="number" value={link.order ?? idx} onChange={e => handleLinkChange(idx, 'order', parseInt(e.target.value) || 0)} style={{ width: '60px' }} />
                                <input type="number" min="0" value={link.extra_points ?? 0} onChange={e => handleLinkChange(idx, 'extra_points', parseInt(e.target.value) || 0)} placeholder="Pts" title="Extra points when claimed" style={{ width: '50px' }} />
                                <label className="link-checkbox" title="User can claim points at most once">
                                    <input type="checkbox" checked={!!link.is_unique_per_user} onChange={e => handleLinkChange(idx, 'is_unique_per_user', e.target.checked)} />
                                    <span>1×</span>
                                </label>
                                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLink(idx)}><FiTrash2 /> Remove</button>
                            </div>
                        ))}
                        {links.length === 0 && (
                            <p className="text-muted" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>No reward links. Add links that will appear when users redeem these eggs.</p>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Generating...' : `Generate ${form.count} Egg${form.count > 1 ? 's' : ''}`}
                    </button>
                </form>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
                <div className="section">
                    <div className="alert alert-success">
                        Successfully created {result.created} egg{result.created > 1 ? 's' : ''}!
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Title</th>
                                    <th>Rarity</th>
                                    <th>Points</th>
                                    <th>QR URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.eggs.map((egg) => (
                                    <tr key={egg.id}>
                                        <td className="code-cell">{String(egg.code_identifier).slice(0, 8)}...</td>
                                        <td>{egg.title || '—'}</td>
                                        <td><span className={`badge badge-${egg.rarity}`}>{egg.rarity}</span></td>
                                        <td>{egg.points}</td>
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
