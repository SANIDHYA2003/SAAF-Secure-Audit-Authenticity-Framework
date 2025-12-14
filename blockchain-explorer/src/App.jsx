import React, { useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';

// Context
import { AppContext, AppContextProvider, ADDRESSES, ROLES } from './context/AppContext';

// Services
import AuthService from './services/AuthService';

// Pages
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

// Dashboards
import ManufacturerDashboard from './components/RoleViews/ManufacturerDashboard';
import DistributorDashboard from './components/RoleViews/DistributorDashboard';
import TransporterDashboard from './components/RoleViews/TransporterDashboard';
import RetailerDashboard from './components/RoleViews/RetailerDashboard';
import ConsumerLookup from './components/RoleViews/ConsumerLookup';

// Icons
import { Factory, Truck, Store, User, Package, Shield, LogOut, Building2, Users, Settings, ShieldCheck } from 'lucide-react';

export const useApp = () => useContext(AppContext);

// ==================== MAIN DASHBOARD ====================
function Dashboard({ currentRole, onSwitchRole, user, org, onLogout, isDemoMode }) {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Manager');
    const [inviteCode, setInviteCode] = useState('');
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'profile'

    const roleConfig = [
        { role: ROLES.MANUFACTURER, label: "Manufacturer", icon: Factory, color: "from-cyan-500 to-blue-500" },
        { role: ROLES.DISTRIBUTOR, label: "Distributor", icon: Truck, color: "from-orange-500 to-amber-500" },
        { role: ROLES.LOGISTICS, label: "Transporter", icon: Truck, color: "from-blue-500 to-indigo-500" },
        { role: ROLES.RETAILER, label: "Retailer", icon: Store, color: "from-pink-500 to-rose-500" },
        { role: ROLES.CONSUMER, label: "Consumer", icon: User, color: "from-green-500 to-emerald-500" },
    ];

    const renderView = () => {
        if (currentView === 'profile') {
            return <ProfilePage />;
        }

        switch (currentRole) {
            case ROLES.MANUFACTURER: return <ManufacturerDashboard />;
            case ROLES.DISTRIBUTOR: return <DistributorDashboard />;
            case ROLES.LOGISTICS: return <TransporterDashboard />;
            case ROLES.RETAILER: return <RetailerDashboard />;
            case ROLES.CONSUMER: return <ConsumerLookup />;
            default: return <ConsumerLookup />;
        }
    };

    const handleInvite = async () => {
        try {
            const invite = await AuthService.createInvite(org.orgId, inviteEmail, inviteRole, user.userId);
            setInviteCode(invite.code);
            setInviteEmail('');
        } catch (err) {
            alert(err.message);
        }
    };

    // Get demo address for current role
    const getDemoAddress = () => {
        const roleMap = {
            [ROLES.MANUFACTURER]: ADDRESSES.MANUFACTURER,
            [ROLES.DISTRIBUTOR]: ADDRESSES.DISTRIBUTOR,
            [ROLES.LOGISTICS]: ADDRESSES.LOGISTICS,
            [ROLES.RETAILER]: ADDRESSES.RETAILER,
            [ROLES.CONSUMER]: ADDRESSES.CONSUMER
        };
        return roleMap[currentRole] || '';
    };

    const currentRoleConfig = roleConfig.find(r => r.role === currentRole) || roleConfig[0];

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 bg-[#12141c] border-r border-white/5 flex flex-col shadow-2xl shrink-0 z-20 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
                </div>

                {/* Logo */}
                <div className="h-24 flex items-center px-8 border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 ring-1 ring-white/10">
                            <Package size={24} className="text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-2xl tracking-tight text-white">VerifyChain</div>
                            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
                                {isDemoMode ? 'Demo Mode' : 'Enterprise'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Info Card */}
                {org && !isDemoMode && (
                    <div className="px-6 py-8 relative z-10">
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden group hover:border-white/20 transition-all">
                            {/* Role Color Bar */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentRoleConfig.color}`}></div>

                            <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/70 shadow-sm">
                                    {org.type}
                                </span>
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${org.onChain?.status === 'verified' ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${org.onChain?.status === 'verified' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                                    {org.onChain?.status === 'verified' ? 'Verified' : 'Pending'}
                                </div>
                            </div>

                            <h2 className="font-bold text-lg text-white mb-1 truncate">{org.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                                <span className="opacity-50">ID:</span> <span className="text-white/60">{org.orgId}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 relative z-10 scrollbar-hide">
                    {/* Section Header */}
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {isDemoMode ? 'Select Persona' : 'Main Menu'}
                    </div>

                    {isDemoMode ? (
                        // Demo Mode - Persona Switcher
                        roleConfig.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentRole === item.role;
                            return (
                                <button
                                    key={item.role}
                                    onClick={() => onSwitchRole(item.role)}
                                    className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${isActive
                                        ? "bg-white/10 shadow-lg text-white ring-1 ring-white/10"
                                        : "hover:bg-white/5 text-gray-400 hover:text-white"
                                        }`}
                                >
                                    {isActive && <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-10`}></div>}

                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive
                                        ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                                        : "bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:scale-110"
                                        }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <div className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>{item.label}</div>
                                        <div className="text-[10px] opacity-50 font-normal">Switch Role</div>
                                    </div>
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                                </button>
                            );
                        })
                    ) : (
                        // Regular Mode - Navigation
                        <div className="space-y-1">
                            {roleConfig.filter(item => item.role === currentRole).map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === 'dashboard';
                                return (
                                    <button
                                        key="dashboard-link"
                                        onClick={() => setCurrentView('dashboard')}
                                        className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${isActive
                                            ? "bg-white/10 shadow-lg text-white ring-1 ring-white/10"
                                            : "hover:bg-white/5 text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {isActive && <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-10`}></div>}

                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive
                                            ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                                            : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                                            }`}>
                                            <Icon size={18} />
                                        </div>
                                        <span className="font-semibold text-sm">Dashboard</span>
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setCurrentView('profile')}
                                className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden ${currentView === 'profile'
                                    ? "bg-white/10 shadow-lg text-white ring-1 ring-white/10"
                                    : "hover:bg-white/5 text-gray-400 hover:text-white"
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-gray-400 group-hover:bg-white/10 transition-all">
                                    <Settings size={18} />
                                </div>
                                <span className="font-semibold text-sm">Settings</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Team Invite (Regular Mode Only) */}
                {!isDemoMode && org && (
                    <div className="px-6 py-4 relative z-10">
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium group"
                        >
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-white/10 group-hover:text-white transition-colors">
                                <Users size={12} />
                            </div>
                            <span>Invite Team Member</span>
                        </button>
                    </div>
                )}

                {/* User Footer */}
                <div className="p-6 border-t border-white/5 bg-[#0d0f14] relative z-10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-white/50 font-bold text-xs ring-2 ring-black">
                                {isDemoMode ? 'DM' : (user?.name?.substring(0, 2).toUpperCase() || 'US')}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white truncate">
                                    {isDemoMode ? 'Demo User' : (user?.name || 'User')}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono truncate">
                                    {isDemoMode ? getDemoAddress().substring(0, 12) + '...' : user?.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {renderView()}
                </div>
            </main>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card glass p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Users size={20} /> Invite Team Member
                        </h3>

                        {inviteCode ? (
                            <div className="space-y-4">
                                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center">
                                    <p className="text-green-300 text-sm mb-2">Invite Created!</p>
                                    <div className="font-mono text-2xl font-bold text-white">{inviteCode}</div>
                                    <p className="text-xs text-gray-400 mt-2">Share this code with the invited user</p>
                                </div>
                                <button onClick={() => { setShowInviteModal(false); setInviteCode(''); }} className="btn btn-primary w-full">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="input w-full"
                                        placeholder="colleague@company.com"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Role</label>
                                    <select className="input w-full" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                                        <option value="OrgAdmin">Admin</option>
                                        <option value="Manager">Manager</option>
                                        <option value="WarehouseOp">Warehouse Operator</option>
                                        <option value="Driver">Driver</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowInviteModal(false)} className="btn btn-ghost flex-1">Cancel</button>
                                    <button onClick={handleInvite} className="btn btn-primary flex-1">Send Invite</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Use AppContextProvider from context/AppContext.jsx

// ==================== MAIN APP ====================
function App() {
    const [appState, setAppState] = useState('landing'); // 'landing' | 'login' | 'register' | 'dashboard'
    const [selectedRole, setSelectedRole] = useState(ROLES.MANUFACTURER);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentOrg, setCurrentOrg] = useState(null);
    const [accessToken, setAccessToken] = useState(null);

    // Check for existing session
    useEffect(() => {
        const restoreSession = async () => {
            const storedToken = localStorage.getItem('vc_access_token');
            if (storedToken) {
                try {
                    const session = await AuthService.validateSession(storedToken);
                    if (session) {
                        setCurrentUser(session.user);
                        setCurrentOrg(session.org);
                        setAccessToken(storedToken);
                        setSelectedRole(session.org?.type || ROLES.MANUFACTURER);
                        setAppState('dashboard');
                    }
                } catch (error) {
                    console.error('Session restore failed:', error);
                    // Clear invalid token
                    localStorage.removeItem('vc_access_token');
                }
            }
        };
        restoreSession();
    }, []);

    const handleSelectRole = (role, mode) => {
        // Note: role parameter is ignored for login/register
        // The actual role is determined by the user's organization type from backend
        if (mode === 'signin') {
            setAppState('login');
        } else if (mode === 'signup') {
            setAppState('register');
        } else if (mode === 'scan') {
            // Direct to consumer scan (demo mode)
            setSelectedRole(ROLES.CONSUMER);
            setIsDemoMode(true);
            setAppState('dashboard');
        }
    };

    const handleDemoMode = () => {
        setIsDemoMode(true);
        setAppState('dashboard');
    };

    const handleLoginSuccess = (user, org, token) => {
        setCurrentUser(user);
        setCurrentOrg(org);
        setAccessToken(token);
        setSelectedRole(org?.type || ROLES.MANUFACTURER);
        localStorage.setItem('vc_access_token', token);
        setAppState('dashboard');
    };

    const handleRegisterSuccess = (user, org, token) => {
        setCurrentUser(user);
        setCurrentOrg(org);
        setAccessToken(token);
        setSelectedRole(org?.type || ROLES.MANUFACTURER);
        localStorage.setItem('vc_access_token', token);
        setAppState('dashboard');
    };

    const handleLogout = () => {
        if (accessToken) {
            AuthService.logout(accessToken);
        }
        localStorage.removeItem('vc_access_token');
        setCurrentUser(null);
        setCurrentOrg(null);
        setAccessToken(null);
        setIsDemoMode(false);
        setAppState('landing');
    };

    const handleSwitchRole = (role) => {
        setSelectedRole(role);
        // Important: in Demo Mode, when switching "Persona", we must clear any specific 'org' object
        // so that AppContext falls back to the hardcoded ADDRESSES[ROLE].
        // If we don't do this, we might stay connected as "Transporter2" (org) even while looking at the "Retailer" dashboard.
        if (isDemoMode) {
            setCurrentOrg(null);
        }
    };

    // Render based on state
    let content;
    if (appState === 'landing') {
        content = (
            <LandingPage
                onSelectRole={handleSelectRole}
                onDemoMode={handleDemoMode}
            />
        );
    } else if (appState === 'login') {
        content = (
            <LoginPage
                selectedRole={selectedRole}
                onSuccess={(result) => {
                    if (result === 'demo') {
                        handleDemoMode();
                    } else {
                        handleLoginSuccess(result.user, result.org, result.accessToken);
                    }
                }}
                onSwitchToRegister={() => setAppState('register')}
                onBack={() => setAppState('landing')}
            />
        );
    } else if (appState === 'register') {
        content = (
            <RegisterPage
                selectedRole={selectedRole}
                onSuccess={(result) => handleRegisterSuccess(result.user, result.org, result.accessToken)}
                onSwitchToLogin={() => setAppState('login')}
                onBack={() => setAppState('landing')}
            />
        );
    } else {
        content = (
            <Dashboard
                currentRole={selectedRole}
                onSwitchRole={handleSwitchRole}
                user={currentUser}
                org={currentOrg}
                onLogout={handleLogout}
                isDemoMode={isDemoMode}
            />
        );
    }

    return (
        <AppContextProvider
            isDemoMode={isDemoMode}
            currentRole={selectedRole}
            currentOrg={currentOrg}
        >
            {content}
        </AppContextProvider>
    );
}

export default App;
