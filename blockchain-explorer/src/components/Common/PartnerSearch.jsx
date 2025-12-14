import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import './PartnerSearch.css';

const PartnerSearch = ({ type, placeholder, onSelect, initialValue = '' }) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (value) => {
        setQuery(value);
        if (value.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setIsOpen(true);
        try {
            // Build Query
            let url = `http://localhost:5000/api/v1/orgs/search?q=${value}`;
            if (type) url += `&type=${type}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setResults(data.data);
            }
        } catch (error) {
            console.error("Search error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (org) => {
        setQuery(org.name);
        onSelect(org);
        setIsOpen(false);
    };

    return (
        <div className="partner-search-wrapper" ref={wrapperRef}>
            <Search className="partner-search-icon" size={16} />
            <input
                type="text"
                className="partner-search-input"
                placeholder={placeholder || "Search partner..."}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
            />
            {loading && <div className="partner-search-spinner"></div>}

            {isOpen && results.length > 0 && (
                <div className="partner-dropdown">
                    {results.map((org) => (
                        <div
                            key={org.orgId}
                            className="partner-option"
                            onClick={() => handleSelect(org)}
                        >
                            <div className="partner-info">
                                <span className="partner-name">{org.name}</span>
                                <span className="partner-handle">@{org.handle || 'unknown'}</span>
                            </div>
                            <span className="partner-type">{org.type}</span>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && results.length === 0 && !loading && query.length >= 2 && (
                <div className="partner-dropdown">
                    <div className="no-results">No partners found</div>
                </div>
            )}
        </div>
    );
};

export default PartnerSearch;
