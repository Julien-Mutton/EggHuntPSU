/**
 * AdminEmail — Send personalized emails to users.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiSend, FiUsers, FiMail } from 'react-icons/fi';

export default function AdminEmail() {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sendToAll, setSendToAll] = useState(true);
    const [users, setUsers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/auth/admin/users/')
            .then(({ data }) => setUsers(data))
            .catch(() => {});
    }, []);

    const toggleUser = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (!subject.trim() || !body.trim()) {
            setError('Subject and body are required.');
            return;
        }
        if (!sendToAll && selectedIds.length === 0) {
            setError('Select at least one recipient or enable "Send to All".');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/auth/admin/email/send/', {
                subject: subject.trim(),
                body: body.trim(),
                send_to_all: sendToAll,
                recipient_ids: sendToAll ? [] : selectedIds,
            });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send emails.');
        } finally {
            setLoading(false);
        }
    };

    const regularUsers = users.filter(u => u.role === 'user' && u.email);

    return (
        <div className="page">
            <div className="page-header">
                <h1><FiMail style={{ verticalAlign: 'middle' }} /> Send Email</h1>
                <p className="subtitle">Send personalized emails to participants</p>
            </div>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email-subject">Subject</label>
                        <input
                            id="email-subject"
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="e.g., The Egg Hunt starts now!"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email-body">Message</label>
                        <textarea
                            id="email-body"
                            rows="8"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Write your email message here..."
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={sendToAll}
                                onChange={e => setSendToAll(e.target.checked)}
                            />
                            Send to all participants with email addresses
                        </label>
                    </div>

                    {!sendToAll && (
                        <div className="form-group">
                            <label><FiUsers style={{ verticalAlign: 'middle' }} /> Select Recipients</label>
                            <div className="recipient-list">
                                {regularUsers.length === 0 ? (
                                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>No users with email addresses found.</p>
                                ) : (
                                    regularUsers.map(u => (
                                        <label key={u.id} className="recipient-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(u.id)}
                                                onChange={() => toggleUser(u.id)}
                                            />
                                            <span>{u.username}</span>
                                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{u.email}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <FiSend />
                        {loading ? 'Sending...' : 'Send Email'}
                    </button>
                </form>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
                <div className={`alert ${result.failed_count > 0 && result.sent_count === 0 ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1rem' }}>
                    {result.sent_count > 0
                        ? `✅ Sent to ${result.sent_count} recipient${result.sent_count !== 1 ? 's' : ''}.`
                        : '❌ No emails were sent.'}
                    {result.failed_count > 0 && ` (${result.failed_count} failed)`}
                    {result.errors && result.errors.length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', opacity: 0.9 }}>
                            <strong>Errors:</strong>
                            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
