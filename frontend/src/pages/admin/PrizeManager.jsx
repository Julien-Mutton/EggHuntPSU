/**
 * Prize Manager — admin CRUD for prizes.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function PrizeManager() {
    const [prizes, setPrizes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', points_required: 50, is_active: true });
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');

    const loadPrizes = () => {
        setLoading(true);
        api.get('/prizes/')
            .then(({ data }) => setPrizes(data.results || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadPrizes(); }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editingId) {
                await api.patch(`/admin/prizes/${editingId}/`, form);
            } else {
                await api.post('/admin/prizes/', form);
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ name: '', description: '', points_required: 50, is_active: true });
            loadPrizes();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save prize.');
        }
    };

    const handleEdit = (prize) => {
        setForm({
            name: prize.name,
            description: prize.description,
            points_required: prize.points_required,
            is_active: prize.is_active,
        });
        setEditingId(prize.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this prize?')) return;
        try {
            await api.delete(`/admin/prizes/${id}/`);
            loadPrizes();
        } catch {
            alert('Failed to delete prize.');
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>🏆 Prize Manager</h1>
                <p className="subtitle">Create and manage rewards for egg hunters</p>
            </div>

            <button
                className="btn btn-primary"
                onClick={() => {
                    setShowForm(!showForm);
                    setEditingId(null);
                    setForm({ name: '', description: '', points_required: 50, is_active: true });
                }}
                style={{ marginBottom: '1rem' }}
            >
                {showForm ? 'Cancel' : '+ Add Prize'}
            </button>

            {showForm && (
                <div className="form-card" style={{ marginBottom: '2rem' }}>
                    <h3>{editingId ? 'Edit Prize' : 'New Prize'}</h3>
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Prize Name</label>
                            <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea id="description" name="description" value={form.description} onChange={handleChange} rows="3" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="points_required">Points Required</label>
                                <input id="points_required" name="points_required" type="number" min="1" value={form.points_required} onChange={handleChange} required />
                            </div>
                            <div className="form-group checkbox-group" style={{ alignSelf: 'flex-end' }}>
                                <label>
                                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                                    Active
                                </label>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Update Prize' : 'Create Prize'}
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="loading-inline"><div className="spinner" /></div>
            ) : prizes.length === 0 ? (
                <div className="empty-state">
                    <p>No prizes created yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Points Required</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prizes.map((prize) => (
                                <tr key={prize.id}>
                                    <td>
                                        <strong>{prize.name}</strong>
                                        {prize.description && <br />}
                                        <small className="text-muted">{prize.description?.slice(0, 60)}</small>
                                    </td>
                                    <td>{prize.points_required}</td>
                                    <td>
                                        <span className={`badge ${prize.is_active ? 'badge-success' : 'badge-muted'}`}>
                                            {prize.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(prize)}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(prize.id)}>Delete</button>
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
