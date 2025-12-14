import React, { useState, useEffect } from 'react';
import {
    User, Building2, Search, Copy, Check, Shield, Briefcase,
    MapPin, Globe, Loader, Truck, ExternalLink
} from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [org, setOrg] = useState(null);
    const [transporterProfile, setTransporterProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('vc_access_token');
            const response = await fetch('http://localhost:5000/api/v1/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUser(data.data.user);
                setOrg(data.data.org);
                setTransporterProfile(data.data.transporterProfile);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const token = localStorage.getItem('token'); // Use auth token even for search
            const response = await fetch(`http://localhost:5000/api/v1/organizations/search?q=${query}`, {
                // headers: { 'Authorization': `Bearer ${token}` } 
                // Note: Search endpoint might not need auth if public, but good practice
            });
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data.filter(o => o.orgId !== org?.orgId)); // Exclude self
            }
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setSearching(false);
        }
    };

    const copyToClipboard = (text, fieldId) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="loader-spinner"></div>
                <p>Loading your secure profile...</p>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <div className="profile-title">
                    <h1>Organization Profile</h1>
                    <p>Manage your identity and connect with partners</p>
                </div>
                {user?.status === 'active' && (
                    <div className="status-badge active">
                        <Shield size={16} />
                        Active & Verified
                    </div>
                )}
            </div>

            <div className="profile-grid">
                {/* Account Card */}
                <div className="profile-card">
                    <div className="card-header">
                        <div className="card-icon">
                            <User size={24} />
                        </div>
                        <h2 className="card-title">Account Details</h2>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Full Name</label>
                        <div className="field-value">{user?.profile?.name || 'N/A'}</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Email Address</label>
                        <div className="field-value">{user?.profile?.email || 'N/A'}</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Phone Number</label>
                        <div className="field-value">{user?.profile?.phone || 'N/A'}</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">User ID</label>
                        <div className="field-value">
                            <span className="font-mono text-sm">{user?.userId}</span>
                            <button className="copy-btn" onClick={() => copyToClipboard(user?.userId, 'userid')}>
                                {copiedField === 'userid' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Organization Card */}
                <div className="profile-card">
                    <div className="card-header">
                        <div className="card-icon">
                            <Building2 size={24} />
                        </div>
                        <h2 className="card-title">Organization Details</h2>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Organization Name</label>
                        <div className="field-value">{org?.name || 'N/A'}</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Public Handle (Username)</label>
                        <div className="field-value highlight">
                            <span>@{org?.handle || 'unknown'}</span>
                            <button className="copy-btn" onClick={() => copyToClipboard('@' + org?.handle, 'handle')}>
                                {copiedField === 'handle' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Transporter Special Field */}
                    {transporterProfile && (
                        <div className="field-group">
                            <label className="field-label text-yellow-400">Transporter Code (Share this!)</label>
                            <div className="field-value gold">
                                <span>{transporterProfile.transporterCode}</span>
                                <button className="copy-btn" onClick={() => copyToClipboard(transporterProfile.transporterCode, 'transcode')}>
                                    {copiedField === 'transcode' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="field-group">
                        <label className="field-label">Business Type</label>
                        <div className="field-value" style={{ textTransform: 'capitalize' }}>{org?.type || 'N/A'}</div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">GST Number</label>
                        <div className="field-value">{org?.legal?.gst || 'N/A'}</div>
                    </div>
                </div>
            </div>

            {/* Connect Section */}
            <div className="connect-section">
                <div className="connect-header">
                    <h2>Connect Network</h2>
                    <p style={{ color: '#94a3b8' }}>Search for Manufacturers, Distributors, or Transporters by Handle or Name</p>
                </div>

                <div className="search-bar-container">
                    <div className="search-input-wrapper" style={{ position: 'relative' }}>
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search e.g. @pharmocorp or 'Flexport'"
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        {searching && <Loader className="search-icon" style={{ left: 'auto', right: '1rem', animation: 'spin 1s linear infinite' }} size={20} />}
                    </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="search-results">
                        <h3 className="text-gray-400 text-sm mb-2">Found {searchResults.length} matches</h3>
                        {searchResults.map(result => (
                            <div key={result.orgId} className="result-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="card-icon" style={{ width: '40px', height: '40px', fontSize: '0.8rem' }}>
                                        {result.type === 'manufacturer' ? <Briefcase size={20} /> : <Truck size={20} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: 'white' }}>{result.name}</div>
                                        <div style={{ color: '#3b82f6', fontSize: '0.9rem' }}>@{result.handle || 'no-handle'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '100px',
                                        background: 'rgba(255,255,255,0.1)',
                                        fontSize: '0.75rem',
                                        textTransform: 'capitalize'
                                    }}>
                                        {result.type}
                                    </span>
                                    <button className="connect-btn" onClick={() => copyToClipboard(result.orgId, `org-${result.orgId}`)}>
                                        {copiedField === `org-${result.orgId}` ? 'Copied ID' : 'Copy ID'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {searchQuery.length > 2 && searchResults.length === 0 && !searching && (
                    <div className="text-center text-gray-500 mt-4">
                        No organizations found matching "{searchQuery}"
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
