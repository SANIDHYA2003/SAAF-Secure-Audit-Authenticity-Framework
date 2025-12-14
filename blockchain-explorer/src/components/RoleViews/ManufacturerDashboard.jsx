import React, { useState, useContext, useEffect } from 'react';
import { AppContext, ADDRESSES, ROLES } from '../../context/AppContext';
import { Package, Truck, Plus, Factory, ArrowRight, Loader, Users, CheckCircle, XCircle, TrendingUp, AlertCircle, Box, Activity } from "lucide-react";
import { ShipmentAPI, OrgAPI } from '../../services/ApiService';
import { API_BASE_URL } from '../../config';
import PartnerSearch from '../Common/PartnerSearch';

export default function ManufacturerDashboard() {
    const { getContract, address, isDemoMode } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('production'); // 'production' | 'transporters'

    // Forms
    const [productForm, setProductForm] = useState({ id: `GTIN-${Math.floor(Math.random() * 1000)}`, name: "", category: "Food" });
    const [batchForm, setBatchForm] = useState({ id: `B-${Math.floor(Math.random() * 10000)}`, productId: "", qty: 1000 });
    const [shipmentForm, setShipmentForm] = useState({
        batchIds: [],
        receiver: ADDRESSES.DISTRIBUTOR,
        toOrgId: '', // For backend API
        transporter: ADDRESSES.LOGISTICS,
        assignedTransporterId: '', // For backend API
        vehicleNumber: "MH-12-AB-1234",
        driverName: "Rahul Singh",
        driverContact: "+91 98765 43210"
    });

    // Transporter Form
    const [transporterForm, setTransporterForm] = useState({
        wallet: "",
        name: "",
        licenseNumber: "",
        contactNumber: "",
        coldChainCapable: true
    });

    // Data
    const [myBatches, setMyBatches] = useState([]);
    const [transporterPool, setTransporterPool] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);

    // Stats
    const totalProduction = myBatches.reduce((acc, b) => acc + Number(b.quantity), 0);
    const activePartners = transporterPool.length;

    useEffect(() => {
        loadData();
    }, [address]);

    const loadData = async () => {
        try {
            if (!isDemoMode && !address) return;
            const contract = await getContract();

            // Load batches
            const batchIds = [];
            let i = 0;
            while (true) {
                try {
                    const bId = await contract.ownerToBatches(address, i);
                    batchIds.push(bId);
                    i++;
                } catch (e) { break; }
            }

            const loaded = [];
            for (let bId of batchIds) {
                const b = await contract.batches(bId);
                if (b.currentOwner.toLowerCase() === address.toLowerCase() && Number(b.status) === 0) {
                    const p = await contract.products(b.productId);
                    loaded.push({
                        id: b.id,
                        productId: b.productId,
                        quantity: b.quantity,
                        status: b.status,
                        productName: p.name
                    });
                }
            }
            setMyBatches(loaded.reverse());

            // Load transporter pool
            const poolCount = await contract.getTransporterPoolCount(address);
            const pool = [];
            for (let j = 0; j < Number(poolCount); j++) {
                const tAddr = await contract.manufacturerTransporterPool(address, j);
                const tInfo = await contract.transporters(tAddr);
                pool.push({
                    wallet: tAddr,
                    name: tInfo.name,
                    licenseNumber: tInfo.licenseNumber,
                    contactNumber: tInfo.contactNumber,
                    coldChainCapable: tInfo.coldChainCapable,
                    status: Number(tInfo.status)
                });
            }
            setTransporterPool(pool);

            // Load pending requests
            const pendingCount = await contract.getPendingRequestsCount(address);
            const pending = [];
            for (let k = 0; k < Number(pendingCount); k++) {
                const tAddr = await contract.pendingTransporterRequests(address, k);
                const hasPending = await contract.hasPendingRequest(address, tAddr);
                if (hasPending) {
                    const tInfo = await contract.transporters(tAddr);
                    const reqBy = await contract.requestedBy(address, tAddr);
                    pending.push({
                        wallet: tAddr,
                        name: tInfo.name,
                        licenseNumber: tInfo.licenseNumber,
                        contactNumber: tInfo.contactNumber,
                        coldChainCapable: tInfo.coldChainCapable,
                        requestedBy: reqBy
                    });
                }
            }
            setPendingRequests(pending);

        } catch (e) {
            console.error("Load error:", e);
        }
    };

    const registerProduct = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.registerProduct(productForm.id, productForm.name, productForm.category);
            await tx.wait();
            setLogs(p => [`✅ Registered ${productForm.name} (${productForm.id})`, ...p]);
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const createBatch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contract = await getContract();
            const exp = Math.floor(Date.now() / 1000) + 31536000;
            const tx = await contract.createBatch(batchForm.id, batchForm.productId, batchForm.qty, exp, "Factory A");
            await tx.wait();
            setLogs(p => [`✅ Minted Batch ${batchForm.id}`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const createShipment = async () => {
        setLoading(true);
        try {
            const contract = await getContract();
            const sId = "SH-" + Math.floor(Math.random() * 10000);

            const tx = await contract.createShipment(
                sId,
                shipmentForm.batchIds,
                shipmentForm.receiver,
                shipmentForm.transporter,
                "Factory Loading Dock",
                shipmentForm.vehicleNumber,
                shipmentForm.driverName,
                shipmentForm.driverContact
            );
            await tx.wait();
            setLogs(p => [`✅ Shipment ${sId} Created on Blockchain`, ...p]);

            if (!isDemoMode && shipmentForm.toOrgId) {
                try {
                    const payload = {
                        shipmentId: sId,
                        toOrgId: shipmentForm.toOrgId,
                        assignedTransporterId: shipmentForm.assignedTransporterId || undefined,
                        batchIds: shipmentForm.batchIds,
                        meta: {
                            origin: 'Factory Loading Dock',
                            notes: 'Created from Manufacturer Dashboard',
                            blockchainTx: tx.hash
                        },
                        vehicle: {
                            number: shipmentForm.vehicleNumber,
                            driverName: shipmentForm.driverName,
                            driverContact: shipmentForm.driverContact
                        }
                    };
                    await ShipmentAPI.create(payload);
                    setLogs(p => [`✅ Shipment ${sId} tracked in Database`, ...p]);
                } catch (dbError) {
                    console.warn('MongoDB save failed:', dbError);
                }
            }

            loadData();
            setShipmentForm({ ...shipmentForm, batchIds: [] });
        } catch (err) {
            setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]);
        }
        setLoading(false);
    };

    const addTransporter = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.addTransporterToPool(
                transporterForm.wallet,
                transporterForm.name,
                transporterForm.licenseNumber,
                transporterForm.contactNumber,
                transporterForm.coldChainCapable
            );
            await tx.wait();
            setLogs(p => [`✅ Added ${transporterForm.name} to transporter pool`, ...p]);
            setTransporterForm({ wallet: "", name: "", licenseNumber: "", contactNumber: "", coldChainCapable: true });
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const approveRequest = async (wallet) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.approveTransporter(wallet);
            await tx.wait();
            setLogs(p => [`✅ Approved transporter ${wallet.slice(0, 10)}...`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const rejectRequest = async (wallet) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.rejectTransporter(wallet);
            await tx.wait();
            setLogs(p => [`❌ Rejected transporter request`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const handleTransporterSelect = async (org) => {
        // 1. Set the Transporter Wallet Address
        // CRITICAL: In Demo Mode, ALWAYS use the default demo wallet so the user can see the shipment when they switch roles.
        // In Production, use the organization's real on-chain address.
        const targetWallet = isDemoMode ? ADDRESSES.LOGISTICS : (org.onChain?.address || ADDRESSES.LOGISTICS);

        console.log("Selected Transporter:", org.name, "Wallet:", targetWallet, "DemoMode:", isDemoMode);

        setShipmentForm(prev => ({
            ...prev,
            assignedTransporterId: org.orgId,
            transporter: targetWallet
        }));

        // 2. Fetch Profile for Auto-fill
        try {
            const res = await fetch(`${API_BASE_URL}/orgs/${org.orgId}/transporter-profile`);
            const data = await res.json();

            if (data.success && data.data) {
                const profile = data.data;

                // Better Fallbacks to ensure fields actually change
                // If specific vehicle/driver is missing, use Org-level info
                const vehicleNum = profile.vehicles?.[0]?.vehicleNumber || `MH-${Math.floor(10 + Math.random() * 89)}-${String.fromCharCode(65 + Math.random() * 25)}${String.fromCharCode(65 + Math.random() * 25)}-${Math.floor(1000 + Math.random() * 9000)}`;
                const driverName = profile.drivers?.[0]?.name || profile.name || org.name || "Assigned Driver";
                const driverPhone = profile.drivers?.[0]?.phone || profile.contactNumber || org.contactNumber || "+91 98765 43210";

                console.log("Auto-filling Shipment:", { vehicleNum, driverName, driverPhone });

                setShipmentForm(prev => ({
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

    const toggleBatchSelection = (id) => {
        if (shipmentForm.batchIds.includes(id)) {
            setShipmentForm({ ...shipmentForm, batchIds: shipmentForm.batchIds.filter(x => x !== id) });
        } else {
            setShipmentForm({ ...shipmentForm, batchIds: [...shipmentForm.batchIds, id] });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/30 text-white">
                            <Factory size={24} />
                        </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Manufacturer Console
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 ml-1">Production control, batch minting, and logistics</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('production')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'production' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        Production
                    </button>
                    <button onClick={() => setActiveTab('transporters')} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'transporters' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        Partners
                        {pendingRequests.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                            <Box size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Batches</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{myBatches.length}</div>
                    <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">In Inventory</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Activity size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Units</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalProduction}</div>
                    <div className="text-xs text-blue-400 mt-1">Produced items</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Logistics</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{activePartners}</div>
                    <div className="text-xs text-purple-400 mt-1">Active Partners</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                            <Truck size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Shipments</span>
                    </div>
                    <div className="text-2xl font-bold text-white">4</div>
                    <div className="text-xs text-amber-400 mt-1">In Transit</div>
                </div>
            </div>

            {activeTab === 'production' ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Define Product */}
                        <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                            <h3 className="card-title mb-6 flex items-center gap-2 font-bold text-white">
                                <Package size={20} className="text-cyan-400" /> Define New Product
                            </h3>
                            <form onSubmit={registerProduct} className="space-y-4 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">GTIN / ID</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                            placeholder="GTIN / ID" value={productForm.id} onChange={e => setProductForm({ ...productForm, id: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                                        <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                            value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                                            <option>Food</option><option>Pharma</option><option>Electronics</option><option>Fashion</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Product Name</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                        placeholder="e.g. Organic Rice Flour" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                </div>
                                <button disabled={loading} className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/20">{loading ? <Loader className="animate-spin mx-auto" size={16} /> : "Register Product"}</button>
                            </form>
                        </div>

                        {/* Mint Batch */}
                        <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-purple-500/10 transition-colors"></div>
                            <h3 className="card-title mb-6 flex items-center gap-2 font-bold text-white">
                                <Plus size={20} className="text-purple-400" /> Mint Production Batch
                            </h3>
                            <form onSubmit={createBatch} className="space-y-4 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Product ID</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-colors"
                                            placeholder="Existing Product ID" value={batchForm.productId} onChange={e => setBatchForm({ ...batchForm, productId: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Batch ID</label>
                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-colors"
                                            placeholder="New Batch ID" value={batchForm.id} onChange={e => setBatchForm({ ...batchForm, id: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Quantity</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-colors"
                                        type="number" placeholder="Units to mint" value={batchForm.qty} onChange={e => setBatchForm({ ...batchForm, qty: e.target.value })} />
                                </div>
                                <button disabled={loading} className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-900/20">{loading ? <Loader className="animate-spin mx-auto" size={16} /> : "Mint Batch"}</button>
                            </form>
                        </div>
                    </div>

                    {/* Shipment Logic */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-gray-900 to-black p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2 relative z-10">
                            <Truck size={20} className="text-cyan-400" /> Outbound Shipment
                        </h3>

                        {!isDemoMode && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-50">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Destination Distributor</label>
                                    <PartnerSearch
                                        type="distributor"
                                        placeholder="Search Distributors..."
                                        onSelect={(org) => setShipmentForm(prev => ({
                                            ...prev,
                                            toOrgId: org.orgId,
                                            receiver: org.onChain?.address || ADDRESSES.DISTRIBUTOR
                                        }))}
                                    />
                                    {shipmentForm.toOrgId && <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Selected: {shipmentForm.toOrgId}</div>}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Logistics Partner</label>
                                    <PartnerSearch
                                        type="transporter"
                                        placeholder="Search Transporters..."
                                        onSelect={handleTransporterSelect}
                                    />
                                    {shipmentForm.assignedTransporterId && <div className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle size={12} /> Selected: {shipmentForm.assignedTransporterId}</div>}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 mb-8">
                            <div className="input-group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Vehicle Number</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="e.g. MH-12-AB-1234" value={shipmentForm.vehicleNumber} onChange={e => setShipmentForm({ ...shipmentForm, vehicleNumber: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Driver Name</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="Full Name" value={shipmentForm.driverName} onChange={e => setShipmentForm({ ...shipmentForm, driverName: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Driver Contact</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="+91..." value={shipmentForm.driverContact} onChange={e => setShipmentForm({ ...shipmentForm, driverContact: e.target.value })} />
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="rounded-2xl bg-[#12141c] border border-white/5 p-6 shadow-xl relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package size={20} className="text-cyan-400" /> Finished Goods Inventory</h3>
                                <button onClick={createShipment} disabled={shipmentForm.batchIds.length === 0 || loading}
                                    className="px-6 py-2 rounded-xl bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/20 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                                    {loading ? <Loader className="animate-spin" size={18} /> : <><ArrowRight size={18} /> Ship Selected ({shipmentForm.batchIds.length})</>}
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
                                            <th className="pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {myBatches.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-12 text-gray-500"><Package size={48} className="mx-auto mb-4 opacity-20" />Factory lines are stopped. Mint a batch.</td></tr>
                                        ) : (
                                            myBatches.map(b => (
                                                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => toggleBatchSelection(b.id)}>
                                                    <td className="py-4 text-center">
                                                        <input type="checkbox" className="checkbox checkbox-primary" checked={shipmentForm.batchIds.includes(b.id)} onChange={() => toggleBatchSelection(b.id)} />
                                                    </td>
                                                    <td className="py-4 pl-4 font-mono text-cyan-300/80 font-medium group-hover:text-cyan-300 transition-colors">{b.id}</td>
                                                    <td className="py-4 text-gray-300 font-medium">{b.productName}</td>
                                                    <td className="py-4 font-bold text-white">{Number(b.quantity)} Units</td>
                                                    <td className="py-4"><span className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">Ready to Ship</span></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </>
            ) : (
                <>
                    {/* Pending Requests */}
                    {pendingRequests.length > 0 && (
                        <div className="rounded-2xl bg-orange-500/5 border border-orange-500/20 p-6">
                            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2"><AlertCircle size={20} /> Pending Approvals</h3>
                            <div className="space-y-4">
                                {pendingRequests.map((t, i) => (
                                    <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white text-lg">{t.name}</div>
                                            <div className="text-sm text-gray-400 font-mono mt-1">{t.wallet}</div>
                                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                                <span className="bg-white/10 px-2 py-1 rounded">Lic: {t.licenseNumber}</span>
                                                <span className={`px-2 py-1 rounded ${t.coldChainCapable ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-700 text-gray-400'}`}>
                                                    {t.coldChainCapable ? "❄️ Cold Chain" : "🌡️ Ambient"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-orange-300/60 mt-2">Req by: {t.requestedBy?.slice(0, 10)}...</div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => approveRequest(t.wallet)} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold flex items-center gap-2"><CheckCircle size={16} /> Approve</button>
                                            <button onClick={() => rejectRequest(t.wallet)} disabled={loading} className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold flex items-center gap-2"><XCircle size={16} /> Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Transporter */}
                    <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl">
                        <h3 className="card-title mb-6 flex items-center gap-2 font-bold text-white">
                            <Plus size={20} className="text-cyan-400" /> Authorized Transporter Pool
                        </h3>
                        <p className="text-sm text-gray-400 mb-6">Manually authorize a transporter to handle your shipments.</p>

                        <form onSubmit={addTransporter} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Wallet Address</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-cyan-500 outline-none transition-colors"
                                        placeholder="0x..." value={transporterForm.wallet} onChange={e => setTransporterForm({ ...transporterForm, wallet: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Company Name</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                        placeholder="Company Name" value={transporterForm.name} onChange={e => setTransporterForm({ ...transporterForm, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">License Number</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                        placeholder="License No." value={transporterForm.licenseNumber} onChange={e => setTransporterForm({ ...transporterForm, licenseNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Contact Number</label>
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                        placeholder="Phone" value={transporterForm.contactNumber} onChange={e => setTransporterForm({ ...transporterForm, contactNumber: e.target.value })} />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors w-fit border border-white/5 hover:border-cyan-500/30">
                                <input type="checkbox" className="checkbox checkbox-info" checked={transporterForm.coldChainCapable} onChange={e => setTransporterForm({ ...transporterForm, coldChainCapable: e.target.checked })} />
                                <span className="font-medium text-sm text-gray-300">Cold Chain Capable Vehicle Fleet</span>
                            </label>
                            <button type="submit" disabled={loading} className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/30">{loading ? <Loader className="animate-spin" size={14} /> : "Add to Pool"}</button>
                        </form>
                    </div>

                    {/* Transporter Pool */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {transporterPool.map((t, i) => (
                            <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-cyan-300 text-lg">{t.name}</div>
                                        <div className="text-xs font-mono text-gray-500">{t.wallet.slice(0, 10)}...{t.wallet.slice(-6)}</div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">Active</span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-400">
                                    <div className="flex items-center gap-2"><span className="text-gray-600">Lic:</span> {t.licenseNumber || "N/A"}</div>
                                    <div className="flex items-center gap-2"><span className="text-gray-600">Tel:</span> {t.contactNumber || "N/A"}</div>
                                </div>
                                {t.coldChainCapable && <div className="mt-4 pt-3 border-t border-white/5 text-xs text-cyan-400 font-medium flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div> Cold Chain Equipped
                                </div>}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Activity Log */}
            {logs.length > 0 && (
                <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex flex-col max-h-60">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Activity Log</h4>
                    <div className="font-mono text-xs flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {logs.map((l, i) => (
                            <div key={i} className="flex gap-2 items-start text-gray-300">
                                <span className="text-gray-600">{new Date().toLocaleTimeString()}</span>
                                <span>{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
