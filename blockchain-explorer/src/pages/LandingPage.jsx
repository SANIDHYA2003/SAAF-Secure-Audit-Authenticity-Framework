import React, { useState, useContext } from 'react';
import {
    Package, ArrowRight, ShieldCheck, Truck, Factory, Store, User,
    CheckCircle, Zap, Globe, Lock, BarChart3, Users, ChevronRight,
    Box, MapPin, FileCheck, TrendingUp, Search, AlertTriangle, Loader, X, Thermometer
} from 'lucide-react';
import { AppContext } from '../context/AppContext';
import ProductJourney from '../components/Common/ProductJourney';
import './LandingPage.css';

export default function LandingPage({ onSelectRole, onDemoMode }) {
    const { getContract } = useContext(AppContext);
    const [verifying, setVerifying] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifyError, setVerifyError] = useState("");
    const [shipmentHistory, setShipmentHistory] = useState([]);

    const handleVerifyParams = (id) => {
        setSearchId(id);
        handleVerify(id);
    };

    const handleVerify = async (idToVerify) => {
        const id = idToVerify || searchId;
        if (!id) return;

        setVerifying(true);
        setVerifyError("");
        setVerifyResult(null);
        setShipmentHistory([]);

        try {
            console.log("🔍 Verifying Batch on Public Home:", id);
            const contract = await getContract();

            const b = await contract.batches(id);
            if (Number(b.mfgDate) === 0) throw new Error("Product ID / Batch not found on blockchain.");

            const p = await contract.products(b.productId);
            const status = Number(b.status);

            setVerifyResult({
                batch: {
                    id: b.id,
                    productId: b.productId,
                    quantity: b.quantity,
                    mfgDate: b.mfgDate,
                    expDate: b.expDate,
                    currentOwner: b.currentOwner,
                    status: b.status,
                    location: b.location
                },
                product: {
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    manufacturer: p.manufacturer
                },
                status: status
            });

            // SCAN HISTORY
            const foundShipments = new Map();
            await scanUserShipments(contract, b.currentOwner, id, foundShipments);
            if (p.manufacturer && p.manufacturer !== b.currentOwner) {
                await scanUserShipments(contract, p.manufacturer, id, foundShipments);
            }

            const history = Array.from(foundShipments.values()).sort((a, b) => a.timestamp - b.timestamp);
            setShipmentHistory(history);

        } catch (err) {
            console.error("Public Verify Error:", err);
            setVerifyError(err.reason || err.message || "Verification failed. Please check the ID.");
        }
        setVerifying(false);
    };

    const scanUserShipments = async (contract, address, batchId, resultsMap) => {
        let i = 0;
        let failCount = 0;
        while (i < 20) {
            try {
                const sId = await contract.userToShipments(address, i);
                if (resultsMap.has(sId)) { i++; continue; }

                const s = await contract.shipments(sId);
                if (s.batchIds) {
                    const ids = Array.isArray(s.batchIds) ? s.batchIds : Object.values(s.batchIds);
                    const contains = ids.some(id => id === batchId || batchId.startsWith(id));

                    if (contains) {
                        resultsMap.set(s.id, {
                            id: s.id,
                            sender: s.sender,
                            receiver: s.receiver,
                            transporter: s.transporter,
                            status: Number(s.status),
                            timestamp: Number(s.timestamp),
                            vehicleNumber: s.vehicleNumber,
                            driverName: s.driverName
                        });
                    }
                }
                i++;
            } catch (e) {
                failCount++;
                if (failCount > 3) break;
                i++;
            }
        }
    };

    const getStatusLabel = (status) => ["Created", "In Transit", "Arrived", "Delivered", "Consumed", "Recalled", "Expired"][status] || "Unknown";
    const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";

    return (
        <div className="landing-page">
            {/* Animated Background */}
            <div className="landing-bg">
                <div className="landing-bg-gradient landing-bg-gradient-1"></div>
                <div className="landing-bg-gradient landing-bg-gradient-2"></div>
                <div className="landing-bg-gradient landing-bg-gradient-3"></div>
            </div>

            {/* Header */}
            <header className="landing-header">
                <div className="landing-container">
                    <div className="landing-header-content">
                        <div className="landing-brand">
                            <div className="landing-brand-icon">
                                <Package size={24} />
                            </div>
                            <div className="landing-brand-text">
                                <div className="landing-brand-title">VerifyChain</div>
                                <div className="landing-brand-subtitle">Enterprise Platform</div>
                            </div>
                        </div>

                        <nav className="landing-nav">
                            <a href="#features" className="landing-nav-link">Features</a>
                            <a href="#solutions" className="landing-nav-link">Solutions</a>
                            <a href="#pricing" className="landing-nav-link">Pricing</a>
                            <a href="#docs" className="landing-nav-link">Docs</a>
                        </nav>

                        <div className="landing-header-actions">
                            <button
                                onClick={() => onSelectRole('manufacturer', 'signin')}
                                className="btn btn-ghost btn-sm"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => onSelectRole('manufacturer', 'signup')}
                                className="btn btn-primary btn-sm"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-container">
                    <div className="landing-hero-badge">
                        <ShieldCheck size={16} />
                        <span>Blockchain-Powered Supply Chain Verification</span>
                    </div>

                    <h1 className="landing-hero-title">
                        Trust Every Step of
                        <span className="gradient-text"> Your Supply Chain</span>
                    </h1>

                    <p className="landing-hero-description">
                        End-to-end traceability, tamper-proof verification, and real-time visibility
                        for enterprise logistics and product authenticity.
                    </p>

                    <div className="landing-hero-actions">
                        <button
                            onClick={() => onSelectRole('manufacturer', 'signup')}
                            className="btn btn-primary btn-xl landing-hero-btn-primary"
                        >
                            Register Your Organization
                            <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={() => onSelectRole('manufacturer', 'signin')}
                            className="btn btn-ghost btn-xl"
                        >
                            Sign In to Dashboard
                        </button>
                    </div>

                    <div className="landing-hero-demo">
                        <button
                            onClick={onDemoMode}
                            className="landing-demo-link"
                        >
                            or explore Demo Mode <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="landing-trust-bar">
                        <div className="landing-trust-item">
                            <CheckCircle size={16} />
                            <span>Blockchain Verified</span>
                        </div>
                        <div className="landing-trust-item">
                            <Lock size={16} />
                            <span>Tamper-Proof</span>
                        </div>
                        <div className="landing-trust-item">
                            <Truck size={16} />
                            <span>Real-Time Tracking</span>
                        </div>
                    </div>

                    {/* Product Verification Bar */}
                    <div className="landing-verification-section">
                        <div className="landing-verification-card">
                            <div className="landing-verification-header">
                                <div className="landing-verification-icon">
                                    <Package size={24} />
                                </div>
                                <div className="landing-verification-text">
                                    <h3 className="landing-verification-title">Verify Product Authenticity</h3>
                                    <p className="landing-verification-subtitle">Scan QR code or enter Product ID to trace the complete journey</p>
                                </div>
                            </div>

                            <div className="landing-verification-input-group">
                                <div className="landing-verification-tabs">
                                    <button className="landing-verification-tab landing-verification-tab-active">
                                        <Package size={18} />
                                        <span>Product ID</span>
                                    </button>
                                    <button className="landing-verification-tab">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z" />
                                        </svg>
                                        <span>Scan QR</span>
                                    </button>
                                </div>

                                <div className="landing-verification-input-wrapper">
                                    <input
                                        type="text"
                                        className="landing-verification-input"
                                        placeholder="Enter Product ID (e.g., PRD-2024-ABC123)"
                                        value={searchId}
                                        onChange={(e) => setSearchId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                    />
                                    <button
                                        onClick={() => handleVerify()}
                                        disabled={verifying}
                                        className="landing-verification-btn"
                                    >
                                        {verifying ? (
                                            <Loader className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <path d="m21 21-4.35-4.35"></path>
                                                </svg>
                                                <span>Verify Now</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {verifyError && (
                                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        {verifyError}
                                    </div>
                                )}

                                <div className="landing-verification-examples">
                                    <span className="landing-verification-example-label">Try:</span>
                                    <button onClick={() => handleVerifyParams("PRD-2024-001")} className="landing-verification-example">PRD-2024-001</button>
                                    <button onClick={() => handleVerifyParams("BATCH-MFR-2024")} className="landing-verification-example">BATCH-MFR-2024</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESULT SECTION - INLINE */}
                    {verifyResult && (
                        <div className="mt-8 animate-in slide-in-from-top-4 fade-in duration-500">
                            <div className="landing-verification-card !p-0 overflow-hidden border-t-4 border-t-cyan-500">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Authenticity Verified</h3>
                                            <p className="text-xs text-green-400 font-mono">Blockchain ID: {verifyResult.batch.id}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setVerifyResult(null)}
                                        className="btn btn-ghost btn-sm rounded-full w-10 h-10 p-0 hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <ProductJourney result={verifyResult} history={shipmentHistory} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </section>

            {/* Features Section */}
            <section id="features" className="landing-section">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Enterprise-Grade Features</h2>
                        <p className="landing-section-subtitle">
                            Everything you need to secure, track, and verify your entire supply chain network.
                        </p>
                    </div>

                    <div className="landing-features-grid">
                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-emerald">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="landing-feature-title">Blockchain Verification</h3>
                            <p className="landing-feature-description">
                                Immutable proof of authenticity for every product and transaction
                            </p>
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-cyan">
                                <Truck size={28} />
                            </div>
                            <h3 className="landing-feature-title">Real-Time Tracking</h3>
                            <p className="landing-feature-description">
                                GPS, temperature, and condition monitoring throughout transit
                            </p>
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-violet">
                                <Lock size={28} />
                            </div>
                            <h3 className="landing-feature-title">Tamper-Proof Records</h3>
                            <p className="landing-feature-description">
                                Cryptographic hashing ensures data integrity at every step
                            </p>
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-amber">
                                <BarChart3 size={28} />
                            </div>
                            <h3 className="landing-feature-title">Analytics Dashboard</h3>
                            <p className="landing-feature-description">
                                Comprehensive insights into your supply chain performance
                            </p>
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-rose">
                                <Globe size={28} />
                            </div>
                            <h3 className="landing-feature-title">Multi-Party Network</h3>
                            <p className="landing-feature-description">
                                Connect manufacturers, distributors, transporters, and retailers
                            </p>
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-icon landing-feature-icon-sky">
                                <Zap size={28} />
                            </div>
                            <h3 className="landing-feature-title">Instant Verification</h3>
                            <p className="landing-feature-description">
                                QR scan verification for consumers and regulators
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solutions Section */}
            <section id="solutions" className="landing-section landing-section-alt">
                <div className="landing-container">
                    <div className="landing-section-header">
                        <h2 className="landing-section-title">Built for Every Supply Chain Role</h2>
                        <p className="landing-section-subtitle">
                            Tailored dashboards and features for each participant in your network.
                        </p>
                    </div>

                    <div className="landing-roles-grid">
                        <div className="landing-role-card">
                            <div className="landing-role-icon landing-role-icon-cyan">
                                <Factory size={32} />
                            </div>
                            <h3 className="landing-role-title">Manufacturers</h3>
                            <p className="landing-role-description">
                                Register products, mint batches, and manage shipments with full traceability
                            </p>
                            <ul className="landing-role-features">
                                <li><CheckCircle size={16} /> Product Registration</li>
                                <li><CheckCircle size={16} /> Batch Minting</li>
                                <li><CheckCircle size={16} /> Shipment Tracking</li>
                            </ul>
                        </div>

                        <div className="landing-role-card">
                            <div className="landing-role-icon landing-role-icon-amber">
                                <Box size={32} />
                            </div>
                            <h3 className="landing-role-title">Distributors</h3>
                            <p className="landing-role-description">
                                Receive inventory, split batches, and forward goods to retailers
                            </p>
                            <ul className="landing-role-features">
                                <li><CheckCircle size={16} /> Inventory Management</li>
                                <li><CheckCircle size={16} /> Batch Splitting</li>
                                <li><CheckCircle size={16} /> Forward Shipping</li>
                            </ul>
                        </div>

                        <div className="landing-role-card">
                            <div className="landing-role-icon landing-role-icon-violet">
                                <Truck size={32} />
                            </div>
                            <h3 className="landing-role-title">Transporters</h3>
                            <p className="landing-role-description">
                                Pickup, track conditions, and deliver with proof of delivery
                            </p>
                            <ul className="landing-role-features">
                                <li><CheckCircle size={16} /> GPS Tracking</li>
                                <li><CheckCircle size={16} /> Condition Monitoring</li>
                                <li><CheckCircle size={16} /> Proof of Delivery</li>
                            </ul>
                        </div>

                        <div className="landing-role-card">
                            <div className="landing-role-icon landing-role-icon-rose">
                                <Store size={32} />
                            </div>
                            <h3 className="landing-role-title">Retailers</h3>
                            <p className="landing-role-description">
                                Accept deliveries and sell to consumers with full authenticity
                            </p>
                            <ul className="landing-role-features">
                                <li><CheckCircle size={16} /> Delivery Acceptance</li>
                                <li><CheckCircle size={16} /> Point of Sale</li>
                                <li><CheckCircle size={16} /> Customer Verification</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="landing-container">
                    <div className="landing-cta-card">
                        <h2 className="landing-cta-title">Ready to Secure Your Supply Chain?</h2>
                        <p className="landing-cta-description">
                            Join leading enterprises using VerifyChain for product authenticity and logistics transparency.
                        </p>
                        <div className="landing-cta-actions">
                            <button
                                onClick={() => onSelectRole('manufacturer', 'signup')}
                                className="btn btn-primary btn-lg"
                            >
                                Create Free Account
                            </button>
                            <button
                                onClick={() => onSelectRole('manufacturer', 'signin')}
                                className="btn btn-ghost btn-lg"
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="landing-footer-content">
                        <div className="landing-footer-brand">
                            <div className="landing-brand-icon-small">
                                <Package size={20} />
                            </div>
                            <span>VerifyChain</span>
                        </div>

                        <div className="landing-footer-links">
                            <a href="#privacy">Privacy Policy</a>
                            <a href="#terms">Terms of Service</a>
                            <a href="#contact">Contact</a>
                            <a href="#docs">Documentation</a>
                        </div>

                        <div className="landing-footer-copyright">
                            © 2024 VerifyChain. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
