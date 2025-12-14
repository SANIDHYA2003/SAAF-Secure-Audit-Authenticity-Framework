import React, { useState, useContext, useEffect } from 'react';
import { AppContext, ADDRESSES, ROLES } from '../../context/AppContext';
import { Truck, Package, ArrowDown, Loader, CheckCircle, Send, User, Plus, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { ShipmentAPI, OrgAPI } from '../../services/ApiService';
import PartnerSearch from '../Common/PartnerSearch';

export default function DistributorDashboard() {
    const { getContract, address, isDemoMode } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'transporters'

    const [inventory, setInventory] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [myTransporterRequests, setMyTransporterRequests] = useState([]);

    const [splitForm, setSplitForm] = useState({ qty: 100 });
    const [shipForm, setShipForm] = useState({
        batchIds: [],
        receiver: ADDRESSES.RETAILER,
        toOrgId: '', // For backend API
        transporter: ADDRESSES.LOGISTICS, // Transporter wallet address
        assignedTransporterId: '', // For backend API
        deliveryMode: "self",
        vehicleNumber: "MH-12-AB-1234",
        driverName: "Rahul Singh",
        driverContact: "+91 98765 43210"
    });

    // Available retailers for shipment destination
    const [availableRetailers, setAvailableRetailers] = useState([]);

    // Request Transporter Form
    const [requestForm, setRequestForm] = useState({
        wallet: "",
        name: "",
        licenseNumber: "",
        contactNumber: "",
        coldChainCapable: false
    });

    // Derived Stats
    const totalInventory = inventory.reduce((acc, curr) => acc + Number(curr.quantity), 0);
    const activeShipments = 12; // Mock

    useEffect(() => {
        loadData();
        loadAvailableRetailers();
    }, [address]);

    // Load available retailers for the destination dropdown
    const loadAvailableRetailers = async () => {
        if (isDemoMode) return;
        try {
            const result = await OrgAPI.listOrgs({ type: 'retailer' });
            if (result.success) {
                setAvailableRetailers(result.data || []);
            }
        } catch (error) {
            console.warn('Failed to load retailers:', error);
        }
    };

    const loadData = async () => {
        try {
            const contract = await getContract();

            // 1. INCOMING SHIPMENTS
            const myShipmentIds = new Set();
            let i = 0;
            while (true) {
                try {
                    const sId = await contract.userToShipments(address, i);
                    myShipmentIds.add(sId);
                    i++;
                } catch (e) { break; }
            }

            const incomingLoaded = [];
            for (let sId of myShipmentIds) {
                const s = await contract.shipments(sId);
                if (s.receiver.toLowerCase() === address.toLowerCase() && Number(s.status) === 3) {
                    incomingLoaded.push({
                        id: s.id,
                        sender: s.sender,
                        status: s.status,
                        vehicleNumber: s.vehicleNumber,
                        driverName: s.driverName
                    });
                }
            }
            setIncoming(incomingLoaded);

            // 2. INVENTORY
            const myBatchIds = [];
            let k = 0;
            while (true) {
                try {
                    const bId = await contract.ownerToBatches(address, k);
                    myBatchIds.push(bId);
                    k++;
                } catch (e) { break; }
            }

            const invLoaded = [];
            for (let bId of myBatchIds) {
                const b = await contract.batches(bId);
                if (b.currentOwner.toLowerCase() === address.toLowerCase() &&
                    (Number(b.status) === 3 || Number(b.status) === 0) &&
                    Number(b.quantity) > 0) {
                    const p = await contract.products(b.productId);
                    invLoaded.push({
                        id: b.id,
                        productId: b.productId,
                        quantity: b.quantity,
                        status: b.status,
                        productName: p.name
                    });
                }
            }
            setInventory(invLoaded.reverse());

        } catch (e) {
            console.error("Load error:", e);
            setLogs(p => [`⚠️ Load error: ${e.message}`, ...p]);
        }
    };

    const acceptDelivery = async (sId) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.acceptDelivery(sId, "Distributor Warehouse");
            await tx.wait();
            setLogs(p => [`✅ Accepted Delivery ${sId} - Ownership Transferred`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const splitBatch = async (parentId) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const newId = parentId + "-SUB" + Math.floor(Math.random() * 100);
            const tx = await contract.splitBatch(parentId, newId, splitForm.qty);
            await tx.wait();
            setLogs(p => [`✅ Split ${parentId} → ${newId} (${splitForm.qty} units)`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    // Handle Retailer Selection
    const handleRetailerSelect = (org) => {
        console.log('🏪 Retailer Selected:', org);
        console.log('📍 Retailer Wallet Address:', org.onChain?.address);
        setShipForm(prev => ({
            ...prev,
            toOrgId: org.orgId,
            receiver: org.onChain?.address || ADDRESSES.RETAILER
        }));
    };

    // Handle Transporter Selection
    const handleTransporterSelect = async (org) => {
        console.log('🚚 Transporter Selected:', org);
        console.log('📍 Transporter Wallet Address:', org.onChain?.address);

        // Set basic info
        const targetWallet = isDemoMode ? ADDRESSES.LOGISTICS : (org.onChain?.address || ADDRESSES.LOGISTICS);
        console.log("Selected Transporter Wallet:", targetWallet, "DemoMode:", isDemoMode);

        setShipForm(prev => ({
            ...prev,
            assignedTransporterId: org.orgId,
            transporter: targetWallet
        }));

        // Fetch details from backend
        try {
            const res = await fetch(`http://localhost:5000/api/v1/orgs/${org.orgId}/transporter-profile`);
            const data = await res.json();

            if (data.success && data.data) {
                const profile = data.data;

                // Auto-fill Vehicle (First one or Mock)
                let vehicleNum = "";
                if (profile.vehicles && profile.vehicles.length > 0) {
                    vehicleNum = profile.vehicles[0].vehicleNumber;
                } else {
                    vehicleNum = `MH-${Math.floor(Math.random() * 90) + 10}-AB-${Math.floor(Math.random() * 8999) + 1000}`;
                }

                // Auto-fill Driver (First one or Mock)
                let driverName = "";
                let driverPhone = "";
                if (profile.drivers && profile.drivers.length > 0) {
                    const d = profile.drivers[0];
                    driverName = d.name;
                    driverPhone = d.phone;
                } else {
                    driverName = profile.name || org.name || "Assigned Driver";
                    driverPhone = profile.contactNumber || org.contactNumber || "+91 98765 43210";
                }

                console.log("Auto-filling Shipment:", { vehicleNum, driverName, driverPhone });

                setShipForm(prev => ({
                    ...prev,
                    vehicleNumber: vehicleNum,
                    driverName: driverName,
                    driverContact: driverPhone
                }));
            }
        } catch (e) {
            console.error("Failed to fetch transporter details", e);
        }
    };

    const createShipment = async () => {
        setLoading(true);
        try {
            const contract = await getContract();
            const sId = "SH-" + Math.floor(Math.random() * 10000);

            let tx;
            if (shipForm.deliveryMode === "self") {
                tx = await contract.selfDeliverShipment(
                    sId,
                    shipForm.batchIds,
                    shipForm.receiver,
                    "Distributor Direct Delivery",
                    shipForm.vehicleNumber,
                    shipForm.driverName,
                    shipForm.driverContact
                );
                await tx.wait();
                setLogs(p => [`✅ Self-Delivery ${sId} Complete on Blockchain`, ...p]);
            } else {
                tx = await contract.createShipment(
                    sId,
                    shipForm.batchIds,
                    shipForm.receiver,
                    shipForm.transporter,
                    "Distributor Loading Dock",
                    shipForm.vehicleNumber,
                    shipForm.driverName,
                    shipForm.driverContact
                );
                await tx.wait();
                setLogs(p => [`✅ Shipment ${sId} Created on Blockchain`, ...p]);
            }

            // THEN save to MongoDB if authenticated
            if (!isDemoMode && shipForm.toOrgId) {
                try {
                    const payload = {
                        shipmentId: sId,
                        toOrgId: shipForm.toOrgId,
                        assignedTransporterId: shipForm.deliveryMode === 'transporter' ? shipForm.assignedTransporterId : undefined,
                        batchIds: shipForm.batchIds,
                        selfDelivery: shipForm.deliveryMode === 'self',
                        meta: {
                            origin: 'Distributor Warehouse',
                            notes: 'Created from Distributor Dashboard',
                            blockchainTx: tx.hash
                        },
                        vehicle: {
                            number: shipForm.vehicleNumber,
                            driverName: shipForm.driverName,
                            driverContact: shipForm.driverContact
                        }
                    };
                    await ShipmentAPI.create(payload);
                    setLogs(p => [`✅ Shipment ${sId} tracked in Database`, ...p]);
                } catch (dbError) {
                    console.warn('MongoDB save failed:', dbError);
                }
            }

            loadData();
            setShipForm({ ...shipForm, batchIds: [] });
        } catch (err) {
            setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]);
        }
        setLoading(false);
    };

    const requestTransporter = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.requestTransporter(
                ADDRESSES.MANUFACTURER,
                requestForm.wallet,
                requestForm.name,
                requestForm.licenseNumber,
                requestForm.contactNumber,
                requestForm.coldChainCapable
            );
            await tx.wait();
            setLogs(p => [`✅ Requested ${requestForm.name} for manufacturer approval`, ...p]);
            setRequestForm({ wallet: "", name: "", licenseNumber: "", contactNumber: "", coldChainCapable: false });
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const toggleBatchSelection = (id) => {
        if (shipForm.batchIds.includes(id)) {
            setShipForm({ ...shipForm, batchIds: shipForm.batchIds.filter(x => x !== id) });
        } else {
            setShipForm({ ...shipForm, batchIds: [...shipForm.batchIds, id] });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-200">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-900/30 text-white">
                            <Truck size={24} />
                        </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Distributor Console
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 ml-1">Logistics hub, inventory management, and distribution</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('operations')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'operations' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        Operations
                    </button>
                    <button onClick={() => setActiveTab('transporters')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'transporters' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        Transporters
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                            <Package size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Warehouse Stock</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalInventory}</div>
                    <div className="text-xs text-gray-400 mt-1">Units available</div>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Send size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Active Shipments</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{activeShipments}</div>
                    <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">On the road</div>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 group-hover:scale-110 transition-transform">
                            <ArrowDown size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Incoming</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{incoming.length}</div>
                    <div className="text-xs text-yellow-400 mt-1">Batches arriving</div>
                </div>
            </div>

            {activeTab === 'operations' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Operations Area (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Shipment Configuration */}
                        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-gray-900 to-black p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2 relative z-10">
                                <TrendingUp size={20} className="text-orange-400" /> Outbound Shipment
                            </h3>

                            {/* Partner Search Section */}
                            {!isDemoMode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-50">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Destination Retailer</label>
                                        <PartnerSearch
                                            type="retailer"
                                            placeholder="Search Retailers..."
                                            onSelect={handleRetailerSelect}
                                        />
                                        {shipForm.toOrgId && <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Selected: {shipForm.toOrgId}</div>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Logistics Partner</label>
                                        <PartnerSearch
                                            type="transporter"
                                            placeholder="Search Transporters..."
                                            onSelect={handleTransporterSelect}
                                        />
                                        {shipForm.assignedTransporterId && <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Selected: {shipForm.assignedTransporterId}</div>}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6 relative z-10">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Delivery Mode</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setShipForm({ ...shipForm, deliveryMode: "self" })}
                                        className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium ${shipForm.deliveryMode === "self" ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"}`}>
                                        <User size={18} /> Self Delivery
                                    </button>
                                    <button onClick={() => setShipForm({ ...shipForm, deliveryMode: "transporter" })}
                                        className={`flex-1 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium ${shipForm.deliveryMode === "transporter" ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"}`}>
                                        <Truck size={18} /> 3rd Party Logistics
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Vehicle No.</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none transition-colors"
                                        placeholder="e.g. MH-12-AB-1234" value={shipForm.vehicleNumber}
                                        onChange={e => setShipForm({ ...shipForm, vehicleNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Driver Name</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none transition-colors"
                                        placeholder="Full Name" value={shipForm.driverName}
                                        onChange={e => setShipForm({ ...shipForm, driverName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Contact</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none transition-colors"
                                        placeholder="+91..." value={shipForm.driverContact}
                                        onChange={e => setShipForm({ ...shipForm, driverContact: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="rounded-2xl bg-[#12141c] border border-white/5 p-6 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package size={20} className="text-orange-400" /> Warehouse Inventory</h3>
                                <button onClick={createShipment} disabled={shipForm.batchIds.length === 0 || loading}
                                    className="px-6 py-2 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                                    {loading ? <Loader className="animate-spin" size={18} /> : <><Send size={18} /> Ship Selected ({shipForm.batchIds.length})</>}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10">
                                        <tr>
                                            <th className="pb-3 w-10 text-center">Select</th>
                                            <th className="pb-3 pl-4">Batch ID</th>
                                            <th className="pb-3">Product Name</th>
                                            <th className="pb-3">Quantity</th>
                                            <th className="pb-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {inventory.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-12 text-gray-500"><Package size={48} className="mx-auto mb-4 opacity-20" />Warehouse Empty</td></tr>
                                        ) : (
                                            inventory.map(b => (
                                                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 text-center">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-transparent text-orange-500 focus:ring-orange-500"
                                                            checked={shipForm.batchIds.includes(b.id)} onChange={() => toggleBatchSelection(b.id)} />
                                                    </td>
                                                    <td className="py-4 pl-4 font-mono text-orange-300/80 font-medium group-hover:text-orange-300 transition-colors">{b.id}</td>
                                                    <td className="py-4 text-gray-300 font-medium">{b.productName}</td>
                                                    <td className="py-4 font-bold text-white">{Number(b.quantity)} Units</td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            <input type="number" className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-center text-xs text-white"
                                                                placeholder="Qty" onChange={e => setSplitForm({ qty: parseInt(e.target.value) || 0 })} />
                                                            <button onClick={() => splitBatch(b.id)} disabled={loading}
                                                                className="px-3 py-1 rounded border border-white/20 text-xs font-medium text-gray-400 hover:text-white hover:border-white/40 transition-colors">
                                                                Split
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Incoming & Logs (1/3) */}
                    <div className="space-y-6">
                        {/* Incoming Deliveries */}
                        <div className="rounded-2xl bg-[#1a1d26] border border-white/10 p-6 shadow-xl relative overflow-hidden">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                                <ArrowDown size={18} className="text-yellow-400" /> Incoming Deliveries
                            </h3>

                            {incoming.length === 0 ? (
                                <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5 border-dashed relative z-10">
                                    <Package size={32} className="mx-auto mb-3 opacity-20 text-gray-400" />
                                    <p className="text-xs text-gray-500">No shipments incoming.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 relative z-10">
                                    {incoming.map((s, i) => (
                                        <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all hover:bg-white/5">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">ARRIVING</span>
                                                <span className="text-[10px] font-mono text-gray-500">{s.id}</span>
                                            </div>
                                            <div className="mb-3">
                                                <div className="text-sm font-medium text-white">From {s.sender.slice(0, 8)}...</div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Truck size={10} /> {s.vehicleNumber || 'No Info'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => acceptDelivery(s.id)}
                                                disabled={loading}
                                                className="w-full py-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 text-yellow-400 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader className="animate-spin" size={12} /> : "Verify & Accept"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Activity Log */}
                        <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex flex-col h-64">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Clock size={12} /> Activity Log
                            </h4>
                            <div className="font-mono text-xs flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {logs.length === 0 ? (
                                    <div className="text-gray-600 italic text-center pt-10">No recent activity</div>
                                ) : logs.map((l, i) => (
                                    <div key={i} className="flex gap-3 items-start animate-in slide-in-from-left-2 fade-in duration-300 border-l-2 border-white/10 pl-3 py-1">
                                        <div className="text-gray-600 text-[10px] min-w-[50px]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className={`${l.includes('❌') ? "text-red-400" : "text-gray-300"} leading-snug`}>
                                            {l.replace('✅', '').replace('❌', '').trim()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Request New Transporter */}
                    <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-2 text-white flex items-center gap-2">
                            <Plus size={20} className="text-purple-400" /> Request Transporter
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">Submit a transporter for manufacturer approval. Once approved, you can use them for shipments.</p>

                        <form onSubmit={requestTransporter} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Transporter Wallet</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-purple-500 outline-none transition-colors"
                                        placeholder="0x..." value={requestForm.wallet} onChange={e => setRequestForm({ ...requestForm, wallet: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Company Name</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                        placeholder="Company Name" value={requestForm.name} onChange={e => setRequestForm({ ...requestForm, name: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">License No.</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                            placeholder="LIC-..." value={requestForm.licenseNumber} onChange={e => setRequestForm({ ...requestForm, licenseNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Contact</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                                            placeholder="Phone" value={requestForm.contactNumber} onChange={e => setRequestForm({ ...requestForm, contactNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors w-full border border-white/5 hover:border-purple-500/30">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-600 bg-transparent text-purple-500 focus:ring-purple-500"
                                    checked={requestForm.coldChainCapable} onChange={e => setRequestForm({ ...requestForm, coldChainCapable: e.target.checked })} />
                                <span className="font-medium text-sm text-gray-300">Cold Chain Capable Vehicle Fleet</span>
                            </label>

                            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2">
                                {loading ? <Loader className="animate-spin" size={18} /> : "Submit for Approval"}
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
                        <h3 className="card-title mb-4 flex gap-2 text-blue-300 font-bold">ℹ️ How It Works</h3>
                        <div className="space-y-4 text-sm text-blue-200/70 leading-relaxed">
                            <p className="flex gap-2"><div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold shrink-0">1</div> You submit a transporter request with their details</p>
                            <p className="flex gap-2"><div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold shrink-0">2</div> The manufacturer reviews and approves/rejects</p>
                            <p className="flex gap-2"><div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold shrink-0">3</div> Once approved, the transporter can handle shipments for this supply chain</p>
                            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2 items-start">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <span>This ensures only verified transporters handle products, preventing counterfeits and ensuring accountability in the supply chain.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
