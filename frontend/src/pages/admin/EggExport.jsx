/**
 * Egg Export page — export QR codes as printable PDF.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function EggExport() {
    const [eggs, setEggs] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        api.get('/admin/eggs/?redeemed=false&page_size=10000')
            .then(({ data }) => setEggs(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selected.length === eggs.length) {
            setSelected([]);
        } else {
            setSelected(eggs.map(e => e.id));
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/admin/eggs/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    egg_ids: selected.length > 0 ? selected : [],
                }),
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'egg_hunt_qrcodes.pdf';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to export PDF. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>🖨️ Export QR Codes</h1>
                <p className="subtitle">Download printable QR code sheets for your event</p>
            </div>

            <div className="export-controls">
                <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
                    {exporting ? 'Generating PDF...' : `Export ${selected.length > 0 ? selected.length : 'All Unclaimed'} Eggs as PDF`}
                </button>
                <button className="btn btn-secondary" onClick={selectAll}>
                    {selected.length === eggs.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : eggs.length === 0 ? (
                <div className="empty-state">
                    <p>No unclaimed eggs available for export.</p>
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
                            </tr>
                        </thead>
                        <tbody>
                            {eggs.map((egg) => (
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
