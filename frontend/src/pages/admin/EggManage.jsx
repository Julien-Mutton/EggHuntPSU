import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { FiX, FiPlus, FiTrash2, FiSave } from 'react-icons/fi';

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

export default function EggManage() {
    const [eggs, setEggs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [editingEgg, setEditingEgg] = useState(null);
    const [importing, setImporting] = useState(false);
    const [availableVideos, setAvailableVideos] = useState([]);

    useEffect(() => {
        api.get('/admin/eggs/videos/')
            .then(({ data }) => setAvailableVideos(data.videos || []))
            .catch(() => console.error("Could not load local videos"));
    }, []);

    const loadEggs = useCallback(() => {
        setLoading(true);
        let url = '/admin/eggs/?page_size=10000';
        if (filter === 'redeemed') url += '&redeemed=true';
        else if (filter === 'unclaimed') url += '&redeemed=false';
        else if (filter === 'disabled') url += '&is_active=false';
        else if (filter === 'active') url += '&is_active=true';

        api.get(url)
            .then(({ data }) => setEggs(data.results || data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [filter]);

    useEffect(() => { loadEggs(); }, [loadEggs]);

    const openEditor = (egg) => {
        setEditingEgg({
            ...egg,
            _links: egg.reward_links || [],
            _newLinks: [],
            _deletedLinkIds: [],
        });
    };

    const closeEditor = () => setEditingEgg(null);

    const handleEggFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditingEgg(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
        }));
    };

    const handleLinkChange = (idx, field, value, isNew = false) => {
        setEditingEgg(prev => {
            const key = isNew ? '_newLinks' : '_links';
            const links = [...prev[key]];
            links[idx] = { ...links[idx], [field]: value };
            return { ...prev, [key]: links };
        });
    };

    const addNewLink = () => {
        setEditingEgg(prev => ({
            ...prev,
            _newLinks: [...prev._newLinks, { name: '', url: '', icon: '', order: (prev._links.length + prev._newLinks.length), extra_points: 0, is_unique_per_user: false }],
        }));
    };

    const removeExistingLink = (idx) => {
        setEditingEgg(prev => {
            const link = prev._links[idx];
            return {
                ...prev,
                _links: prev._links.filter((_, i) => i !== idx),
                _deletedLinkIds: link.id ? [...prev._deletedLinkIds, link.id] : prev._deletedLinkIds,
            };
        });
    };

    const removeNewLink = (idx) => {
        setEditingEgg(prev => ({
            ...prev,
            _newLinks: prev._newLinks.filter((_, i) => i !== idx),
        }));
    };

    const saveEgg = async () => {
        const egg = editingEgg;
        try {
            await api.patch(`/admin/eggs/${egg.id}/`, {
                title: egg.title,
                internal_note: egg.internal_note,
                points: egg.points,
                label_text: egg.label_text,
                show_gif: egg.show_gif,
                gif_url: egg.gif_url,
                video_url: egg.video_url,
                local_video_path: egg.local_video_path || '',
                is_active: egg.is_active,
                rarity: egg.rarity,
                reward_message: egg.reward_message,
                is_rickroll: egg.is_rickroll,
            });

            for (const id of egg._deletedLinkIds) {
                await api.delete(`/admin/eggs/${egg.id}/links/${id}/`);
            }

            for (const link of egg._links) {
                if (link.id) {
                    await api.patch(`/admin/eggs/${egg.id}/links/${link.id}/`, {
                        name: link.name,
                        url: link.url,
                        icon: link.icon || '',
                        order: link.order,
                        extra_points: link.extra_points ?? 0,
                        is_unique_per_user: link.is_unique_per_user ?? false,
                    });
                }
            }

            for (const link of egg._newLinks) {
                if (link.name && link.url) {
                    await api.post(`/admin/eggs/${egg.id}/links/`, {
                        name: link.name,
                        url: link.url,
                        icon: link.icon || '',
                        order: link.order,
                        extra_points: link.extra_points ?? 0,
                        is_unique_per_user: link.is_unique_per_user ?? false,
                    });
                }
            }

            closeEditor();
            loadEggs();
        } catch (err) {
            alert('Failed to save: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
        }
    };

    const downloadJson = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleExportFull = async () => {
        try {
            const { data } = await api.post('/admin/eggs/export/json/', { egg_ids: [], mode: 'full' });
            downloadJson(data, `egghunt_full_backup_${new Date().toISOString().split('T')[0]}.json`);
        } catch {
            alert('Failed to export full backup');
        }
    };

    const handleExportTemplate = async () => {
        try {
            const { data } = await api.post('/admin/eggs/export/json/', { egg_ids: [], mode: 'template' });
            downloadJson(data, `egghunt_template_${new Date().toISOString().split('T')[0]}.json`);
        } catch {
            alert('Failed to export template');
        }
    };

    const handleImportJson = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                setImporting(true);
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error("File does not contain a JSON array of eggs.");
                
                await api.post('/admin/eggs/import/json/', data);
                alert('Import successful!');
                loadEggs();
            } catch (err) {
                alert('Import failed: ' + (err.response?.data?.error || err.message));
            } finally {
                setImporting(false);
                e.target.value = null; // reset input
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Egg Management</h1>
                <p className="subtitle">Track all eggs — who claimed them, when, and their status</p>
            </div>

            <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    {['all', 'unclaimed', 'redeemed', 'active', 'disabled'].map(f => (
                        <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? 'All' : f === 'unclaimed' ? 'Unclaimed' : f === 'redeemed' ? 'Redeemed' : f === 'active' ? 'Active' : 'Disabled'}
                        </button>
                    ))}
                    <span className="filter-count" style={{ marginLeft: '1rem' }}>{eggs.length} egg{eggs.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-primary" onClick={handleExportFull} title="Includes claimed status, user info, and code identifiers">Full Backup</button>
                    <button className="btn btn-sm btn-secondary" onClick={handleExportTemplate} title="Configuration only — no claimed status, creates fresh eggs on import">Export Template</button>
                    <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        {importing ? 'Importing...' : 'Import (.json)'}
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} disabled={importing} />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : eggs.length === 0 ? (
                <div className="empty-state"><p>No eggs found matching this filter.</p></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Title</th>
                                <th>Points</th>
                                <th>Rarity</th>
                                <th>Status</th>
                                <th>Redeemed By</th>
                                <th>Links</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eggs.map((egg) => (
                                <tr key={egg.id} className={egg.is_redeemed ? 'row-redeemed' : 'row-unclaimed'} onClick={() => openEditor(egg)} style={{ cursor: 'pointer' }}>
                                    <td className="code-cell">{String(egg.code_identifier).slice(0, 8)}</td>
                                    <td>{egg.title || '—'}</td>
                                    <td>{egg.points}</td>
                                    <td><span className={`badge badge-${egg.rarity || 'common'}`}>{egg.rarity || 'common'}</span></td>
                                    <td>
                                        <span className={`badge ${egg.is_redeemed ? 'badge-redeemed' : 'badge-unclaimed'}`}>
                                            {egg.is_redeemed ? 'Claimed' : 'Available'}
                                        </span>
                                        {!egg.is_active && (
                                            <span className="badge badge-disabled" style={{ marginLeft: '0.25rem' }}>Disabled</span>
                                        )}
                                    </td>
                                    <td>{egg.redeemed_by_username || '—'}</td>
                                    <td>{(egg.reward_links || []).length}</td>
                                    <td>{new Date(egg.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingEgg && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}>
                    <div className="modal-card egg-edit-modal">
                        <div className="modal-header">
                            <h2>Edit Egg</h2>
                            <button className="btn-icon" onClick={closeEditor}><FiX size={20} /></button>
                        </div>

                        <div className="egg-edit-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input name="title" value={editingEgg.title} onChange={handleEggFieldChange} placeholder="Egg title" />
                                </div>
                                <div className="form-group">
                                    <label>Points</label>
                                    <input name="points" type="number" min="1" value={editingEgg.points} onChange={handleEggFieldChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Rarity</label>
                                    <select name="rarity" value={editingEgg.rarity} onChange={handleEggFieldChange}>
                                        {RARITY_OPTIONS.map(r => (
                                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Label Text</label>
                                    <input name="label_text" value={editingEgg.label_text} onChange={handleEggFieldChange} placeholder="Above QR code" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Reward Message</label>
                                <textarea name="reward_message" value={editingEgg.reward_message} onChange={handleEggFieldChange} rows="2" placeholder="Custom message upon redemption" />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Video Embed URL</label>
                                    <input name="video_url" value={editingEgg.video_url || ''} onChange={handleEggFieldChange} placeholder="https://youtube.com/embed/..." />
                                </div>
                                <div className="form-group">
                                    <label>Local Video Path</label>
                                    <select name="local_video_path" value={editingEgg.local_video_path || ''} onChange={handleEggFieldChange}>
                                        <option value="">-- None --</option>
                                        {availableVideos.map((vid) => (
                                            <option key={vid.path} value={vid.path}>{vid.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" name="show_gif" checked={editingEgg.show_gif} onChange={handleEggFieldChange} />
                                        Show GIF
                                    </label>
                                </div>
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" name="is_active" checked={editingEgg.is_active} onChange={handleEggFieldChange} />
                                        Active
                                    </label>
                                </div>
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input type="checkbox" name="is_rickroll" checked={!!editingEgg.is_rickroll} onChange={handleEggFieldChange} />
                                        🎵 Rick Roll
                                    </label>
                                </div>
                            </div>

                            {editingEgg.show_gif && (
                                <div className="form-group">
                                    <label>GIF URL</label>
                                    <input name="gif_url" value={editingEgg.gif_url} onChange={handleEggFieldChange} placeholder="https://media.giphy.com/..." />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Internal Note</label>
                                <textarea name="internal_note" value={editingEgg.internal_note} onChange={handleEggFieldChange} rows="2" placeholder="Admin-only notes" />
                            </div>

                            <hr className="section-divider" />

                            <div className="links-section">
                                <div className="links-header">
                                    <h3>Reward Links</h3>
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={addNewLink}><FiPlus /> Add Link</button>
                                </div>

                                {(editingEgg._links.length > 0 || editingEgg._newLinks.length > 0) && (
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

                                {editingEgg._links.map((link, idx) => (
                                    <div key={link.id || `existing-${idx}`} className="link-row">
                                        <input className="link-col-name" value={link.name} onChange={e => handleLinkChange(idx, 'name', e.target.value)} placeholder="Link name" aria-label="Link name" />
                                        <input className="link-col-url" value={link.url} onChange={e => handleLinkChange(idx, 'url', e.target.value)} placeholder="https://..." aria-label="Link URL" />
                                        <select className="link-col-icon" value={link.icon || ''} onChange={e => handleLinkChange(idx, 'icon', e.target.value)} aria-label="Icon type">
                                            {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <input className="link-col-order" type="number" value={link.order} onChange={e => handleLinkChange(idx, 'order', parseInt(e.target.value) || 0)} aria-label="Display order" />
                                        <input className="link-col-pts" type="number" min="0" value={link.extra_points ?? 0} onChange={e => handleLinkChange(idx, 'extra_points', parseInt(e.target.value) || 0)} aria-label="Bonus points" />
                                        <label className="link-col-unique link-checkbox" title="Each user can earn points from this link at most once">
                                            <input type="checkbox" checked={!!link.is_unique_per_user} onChange={e => handleLinkChange(idx, 'is_unique_per_user', e.target.checked)} />
                                            <span>1x</span>
                                        </label>
                                        <button type="button" className="btn btn-sm btn-danger link-col-actions" onClick={() => removeExistingLink(idx)} aria-label="Remove link"><FiTrash2 /></button>
                                    </div>
                                ))}

                                {editingEgg._newLinks.map((link, idx) => (
                                    <div key={`new-${idx}`} className="link-row">
                                        <input className="link-col-name" value={link.name} onChange={e => handleLinkChange(idx, 'name', e.target.value, true)} placeholder="Link name" aria-label="Link name" />
                                        <input className="link-col-url" value={link.url} onChange={e => handleLinkChange(idx, 'url', e.target.value, true)} placeholder="https://..." aria-label="Link URL" />
                                        <select className="link-col-icon" value={link.icon || ''} onChange={e => handleLinkChange(idx, 'icon', e.target.value, true)} aria-label="Icon type">
                                            {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <input className="link-col-order" type="number" value={link.order} onChange={e => handleLinkChange(idx, 'order', parseInt(e.target.value) || 0, true)} aria-label="Display order" />
                                        <input className="link-col-pts" type="number" min="0" value={link.extra_points ?? 0} onChange={e => handleLinkChange(idx, 'extra_points', parseInt(e.target.value) || 0, true)} aria-label="Bonus points" />
                                        <label className="link-col-unique link-checkbox" title="Each user can earn points from this link at most once">
                                            <input type="checkbox" checked={!!link.is_unique_per_user} onChange={e => handleLinkChange(idx, 'is_unique_per_user', e.target.checked, true)} />
                                            <span>1x</span>
                                        </label>
                                        <button type="button" className="btn btn-sm btn-danger link-col-actions" onClick={() => removeNewLink(idx)} aria-label="Remove link"><FiTrash2 /></button>
                                    </div>
                                ))}

                                {editingEgg._links.length === 0 && editingEgg._newLinks.length === 0 && (
                                    <p className="text-muted" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>No reward links. Click "Add Link" to attach links shown on redemption.</p>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeEditor}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveEgg}><FiSave /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
