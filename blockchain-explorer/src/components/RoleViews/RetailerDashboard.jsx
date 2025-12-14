import React, { useState, useContext, useEffect } from 'react';
import { AppContext, ADDRESSES, ROLES } from '../../context/AppContext';
import { ShoppingBag, ArrowDown, DollarSign, Loader, Package, CheckCircle, TrendingUp, AlertCircle, Clock, Truck } from "lucide-react";

export default function RetailerDashboard() {
    const { getContract, address } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);

    const [inventory, setInventory] = useState([]);
    const [incoming, setIncoming] = useState([]);

    // Derived Stats
    const totalStock = inventory.reduce((acc, curr) => acc + Number(curr.quantity), 0);
    const totalValue = totalStock * 12.99; // Mock price

    useEffect(() => {
        loadData();
    }, [address]);

    const loadData = async () => {
        try {
            const contract = await getContract();

            // 1. INCOMING SHIPMENTS (Delivered, waiting for acceptance)
            const myShipmentIds = [];
            let i = 0;
            while (true) {
                try {
                    const sId = await contract.userToShipments(address, i);
                    myShipmentIds.push(sId);
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
                        driverName: s.driverName,
                        driverContact: s.driverContact
                    });
                }
            }
            setIncoming(incomingLoaded);

            // 2. INVENTORY (owned batches with stock)
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
                    Number(b.quantity) > 0) {
                    const p = await contract.products(b.productId);
                    invLoaded.push({
                        id: b.id,
                        productId: b.productId,
                        quantity: b.quantity,
                        status: b.status,
                        productName: p.name,
                        category: p.category
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
            const tx = await contract.acceptDelivery(sId, "Retail Store");
            await tx.wait();
            setLogs(p => [`✅ Accepted Delivery ${sId} - Ownership Transferred`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const sellItem = async (bId, qty = 1) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.sellToCustomer(bId, qty);
            await tx.wait();
            setLogs(p => [`✅ Sold ${qty} unit(s) from ${bId} - Recorded on Blockchain`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-200">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-900/30 text-white">
                            <ShoppingBag size={24} />
                        </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Retailer Console
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 ml-1">Manage inventory, sales, and incoming deliveries</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-bold flex items-center gap-2">
                        <DollarSign size={14} /> Store Front Active
                    </span>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-pink-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                            <Package size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Items</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalStock}</div>
                    <div className="text-xs text-gray-400 mt-1">Units in stock</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Est. Value</span>
                    </div>
                    <div className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</div>
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <TrendingUp size={12} /> +12.5% vs last week
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                            <Clock size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Pending</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{incoming.length}</div>
                    <div className="text-xs text-orange-400 mt-1">Deliveries to accept</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Sold Today</span>
                    </div>
                    <div className="text-2xl font-bold text-white">24</div>
                    <div className="text-xs text-gray-400 mt-1">Items sold</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Inventory (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Point of Sale - Inventory */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden p-6 shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div>
                                <h3 className="flex items-center gap-2 text-xl font-bold text-white"><ShoppingBag size={20} className="text-pink-400" /> Shelf Inventory</h3>
                                <p className="text-sm text-gray-400 mt-1">Real-time stock from blockchain</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-colors">Category</button>
                                <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:bg-white/5 transition-colors">Sort by Price</button>
                            </div>
                        </div>

                        {inventory.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20 text-pink-400" />
                                <h4 className="text-lg font-bold mb-2 text-white">Shelf is Empty</h4>
                                <p className="text-sm text-gray-400 max-w-xs mx-auto">No products are currently available for sale. Accept incoming deliveries to replenish stock.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {inventory.map(b => (
                                    <div key={b.id} className="group relative bg-white/5 border border-white/10 p-5 rounded-2xl hover:border-pink-500/50 hover:bg-white/[0.07] transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl shadow-inner border border-white/5">
                                                    {b.category === 'Food' ? '🥬' : b.category === 'Pharma' ? '💊' : '📦'}
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400 opacity-80">{b.category}</div>
                                                    <h4 className="font-bold text-white text-lg leading-tight truncate w-32 md:w-40" title={b.productName}>{b.productName}</h4>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] uppercase font-bold tracking-wide">Verified</span>
                                        </div>

                                        <div className="flex items-end justify-between mt-4">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Stock</div>
                                                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{Number(b.quantity)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-pink-400 tabular-nums">$12.99</div>
                                                <div className="text-[10px] text-gray-500">per unit</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="text-[10px] font-mono text-gray-600 mb-3 truncate flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                                Batch: {b.id}
                                            </div>
                                            <button
                                                onClick={() => sellItem(b.id, 1)}
                                                disabled={loading}
                                                className="w-full py-2 rounded-xl bg-white/5 hover:bg-pink-500 hover:text-white text-gray-300 font-medium text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] shadow-lg"
                                            >
                                                {loading ? <Loader className="animate-spin" size={16} /> : <><DollarSign size={16} /> Record Sale</>}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Incoming & Logs (1/3 width) */}
                <div className="space-y-6">
                    {/* Incoming Deliveries */}
                    <div className="rounded-2xl bg-[#1a1d26] border border-white/10 p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="text-base font-bold text-white flex items-center gap-2"><ArrowDown size={18} className="text-orange-400" /> Receiving Dock</h3>
                            {incoming.length > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-500 text-black text-[10px] font-black uppercase animate-pulse">{incoming.length} New</span>}
                        </div>

                        {incoming.length === 0 ? (
                            <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5 border-dashed relative z-10">
                                <Truck size={32} className="mx-auto mb-3 opacity-20 text-gray-400" />
                                <p className="text-xs text-gray-500">No trucks at the dock.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                {incoming.map((s, i) => (
                                    <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-orange-500/30 transition-all hover:bg-white/5">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">ARRIVED</span>
                                            <span className="text-[10px] font-mono text-gray-500">{s.id}</span>
                                        </div>
                                        <div className="mb-3">
                                            <div className="text-sm font-medium text-white">Shipment from {s.sender.slice(0, 4)}...</div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Truck size={10} /> {s.vehicleNumber || 'No Vehicle Info'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => acceptDelivery(s.id)}
                                            disabled={loading}
                                            className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 border-none text-white text-xs font-bold shadow-lg shadow-orange-900/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader className="animate-spin" size={12} /> : "Accept & Stock"}
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
        </div>
    );
}
