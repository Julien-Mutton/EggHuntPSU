import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function EggExport() {
    const [eggs, setEggs] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filter, setFilter] = useState('not_exported');

    useEffect(() => {
        api.get('/admin/eggs/?redeemed=false&page_size=10000')
            .then(({ data }) => setEggs(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filteredEggs = eggs.filter(egg => {
        if (filter === 'not_exported') return !egg.exported_to_pdf;
        if (filter === 'exported') return egg.exported_to_pdf;
        return true;
    });

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const ids = filteredEggs.map(e => e.id);
        if (ids.every(id => selected.includes(id))) {
            setSelected(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelected(prev => [...new Set([...prev, ...ids])]);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.post('/admin/eggs/export/', {
                egg_ids: selected.length > 0 ? selected : [],
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'egg_hunt_qrcodes.pdf';
            a.click();
            window.URL.revokeObjectURL(url);

            setEggs(prev => prev.map(egg =>
                (selected.length === 0 || selected.includes(egg.id))
                    ? { ...egg, exported_to_pdf: true }
                    : egg
            ));
            setSelected([]);
        } catch {
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const exportedCount = eggs.filter(e => e.exported_to_pdf).length;
    const notExportedCount = eggs.filter(e => !e.exported_to_pdf).length;
    const allFilteredSelected = filteredEggs.length > 0 && filteredEggs.every(e => selected.includes(e.id));

    return (
        <div className="page">
            <div className="page-header">
                <h1>Export QR Codes</h1>
                <p className="subtitle">Download printable QR code sheets for your event</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card stat-primary">
                    <div className="stat-content">
                        <span className="stat-number">{eggs.length}</span>
                        <span className="stat-label">Total Unclaimed</span>
                    </div>
                </div>
                <div className="stat-card stat-success">
                    <div className="stat-content">
                        <span className="stat-number">{exportedCount}</span>
                        <span className="stat-label">Exported</span>
                    </div>
                </div>
                <div className="stat-card stat-warning">
                    <div className="stat-content">
                        <span className="stat-number">{notExportedCount}</span>
                        <span className="stat-label">Not Yet Exported</span>
                    </div>
                </div>
            </div>

            <div className="export-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="filter-bar">
                    {[
                        { key: 'not_exported', label: 'Not Exported' },
                        { key: 'exported', label: 'Exported' },
                        { key: 'all', label: 'All' },
                    ].map(f => (
                        <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={selectAll}>
                        {allFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
                        {exporting ? 'Generating PDF...' : `Export ${selected.length > 0 ? selected.length : 'All Unclaimed'} as PDF`}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : filteredEggs.length === 0 ? (
                <div className="empty-state">
                    <p>No eggs match this filter.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>Code</th>
                                <th>Title</th>
                                <th>Points</th>
                                <th>Label</th>
                                <th>Export Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEggs.map((egg) => (
                                <tr key={egg.id} className={selected.includes(egg.id) ? 'row-selected' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(egg.id)}
                                            onChange={() => toggleSelect(egg.id)}
                                        />
                                    </td>
                                    <td className="code-cell">{String(egg.code_identifier).slice(0, 8)}</td>
                                    <td>{egg.title || '—'}</td>
                                    <td>{egg.points}</td>
                                    <td>{egg.label_text || '—'}</td>
                                    <td>
                                        <span className={`badge ${egg.exported_to_pdf ? 'badge-success' : 'badge-muted'}`}>
                                            {egg.exported_to_pdf ? 'Exported' : 'Not Exported'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
