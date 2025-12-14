import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { Search, ShieldCheck, AlertTriangle, Loader, Factory, Truck, Store, User, MapPin, Package, CheckCircle, Clock } from "lucide-react";

export default function ConsumerLookup() {
    const { getContract } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [batchId, setBatchId] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [shipmentHistory, setShipmentHistory] = useState([]);

    const verifyProduct = async (e) => {
        e.preventDefault();
        if (!batchId) return;

        setLoading(true);
        setError("");
        setResult(null);
        setShipmentHistory([]);

        try {
            console.log("🔍 Verifying Batch:", batchId);
            const contract = await getContract();

            // Fetch Batch
            const b = await contract.batches(batchId);
            console.log("📦 Batch Data:", b);

            if (Number(b.mfgDate) === 0) throw new Error("Batch not found on blockchain.");

            // Fetch Product
            const p = await contract.products(b.productId);
            console.log("🏭 Product Data:", p);

            const status = Number(b.status);

            setResult({
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

            // SEARCH HISTORY
            const foundShipments = new Map();
            await scanUserShipments(contract, b.currentOwner, batchId, foundShipments);
            if (p.manufacturer && p.manufacturer !== b.currentOwner) {
                await scanUserShipments(contract, p.manufacturer, batchId, foundShipments);
            }

            const history = Array.from(foundShipments.values()).sort((a, b) => a.timestamp - b.timestamp);
            setShipmentHistory(history);

        } catch (err) {
            console.error("Verify Error:", err);
            setError(err.reason || err.message || "Failed to verify product.");
        }
        setLoading(false);
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

    const StatusBadge = ({ status }) => {
        if (status === 5) return <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-500 px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl shadow-red-900/20"><AlertTriangle size={32} /> RECALLED / UNSAFE</div>;
        if (status === 6) return <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 text-orange-500 px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl shadow-orange-900/20"><AlertTriangle size={32} /> EXPIRED</div>;
        return <div className="flex items-center gap-3 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 text-green-400 px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl shadow-green-900/20"><ShieldCheck size={32} /> AUTHENTIC PRODUCT</div>;
    };

    const getStatusLabel = (status) => {
        const labels = ["Created", "In Transit", "Arrived", "Delivered", "Consumed", "Recalled", "Expired"];
        return labels[status] || "Unknown";
    };

    const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";

    return (
        <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20 text-slate-200">
            {/* Header */}
            <div className="text-center py-10 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="inline-flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <Package size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tight text-white mb-1">VerifyChain</h1>
                        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
                    </div>
                </div>
                <p className="text-xl text-gray-400 font-light relative z-10">Universal Supply Chain Verification</p>
            </div>

            {/* Search */}
            <div className="relative group z-20">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-[#0F1117] rounded-2xl p-2 shadow-2xl ring-1 ring-white/10">
                    <form onSubmit={verifyProduct} className="flex gap-2">
                        <input className="flex-1 bg-transparent text-xl px-6 py-4 text-white placeholder-gray-500 outline-none font-mono" placeholder="Enter Batch ID (e.g. B-1234)"
                            value={batchId} onChange={e => setBatchId(e.target.value)}
                        />
                        <button disabled={loading} className="px-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
                            {loading ? <Loader className="animate-spin" size={24} /> : <Search size={24} />}
                        </button>
                    </form>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                    <AlertTriangle className="shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {result && (
                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    {/* Status Badge */}
                    <div className="flex justify-center scale-110">
                        <StatusBadge status={result.status} />
                    </div>

                    {/* Product Info Card */}
                    <div className="rounded-3xl border border-white/10 bg-[#151921] overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                        <div className="p-8 border-b border-white/5 bg-white/5 relative z-10">
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-inner">
                                    <Package size={40} className="text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-cyan-500 uppercase tracking-widest mb-1">{result.product.category}</div>
                                    <h2 className="text-3xl font-black text-white leading-tight">{result.product.name}</h2>
                                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                                        <Factory size={14} /> Manufactured by {shortenAddress(result.product.manufacturer)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Batch ID</span>
                                <span className="font-mono text-lg text-cyan-300 font-bold block truncate">{result.batch.id}</span>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Quantity</span>
                                <span className="font-bold text-2xl text-white">{Number(result.batch.quantity)}</span>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Mfg. Date</span>
                                <span className="text-lg text-white font-medium">{new Date(Number(result.batch.mfgDate) * 1000).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Status</span>
                                <span className="inline-block px-3 py-1 rounded-lg bg-white/10 text-white font-medium text-sm">{getStatusLabel(result.status)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Journey Timeline */}
                    <div className="rounded-3xl border border-white/10 bg-[#151921] p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><MapPin size={24} /></div>
                            Product Journey
                        </h3>

                        <div className="relative pl-4">
                            {/* Timeline Line */}
                            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-green-500 opacity-30"></div>

                            {/* Manufacturing */}
                            <div className="relative pl-16 pb-12 group">
                                <div className="absolute left-3 w-8 h-8 rounded-full bg-[#151921] border-2 border-cyan-500 flex items-center justify-center z-10 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                    <Factory size={14} className="text-cyan-400" />
                                </div>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group-hover:border-cyan-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg text-cyan-400">Manufactured</h4>
                                        <span className="text-xs text-gray-500 font-mono bg-black/30 px-2 py-1 rounded">{new Date(Number(result.batch.mfgDate) * 1000).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-500" />
                                        Verified creation by {shortenAddress(result.product.manufacturer)}
                                    </p>
                                </div>
                            </div>

                            {/* Shipment History */}
                            {shipmentHistory.map((sh, idx) => (
                                <div key={idx} className="relative pl-16 pb-12 group">
                                    <div className="absolute left-3 w-8 h-8 rounded-full bg-[#151921] border-2 border-blue-500 flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                        <Truck size={14} className="text-blue-400" />
                                    </div>
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group-hover:border-blue-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-blue-400">Shipment #{sh.id.split('-')[1]}</h4>
                                            <span className="text-xs text-gray-500 font-mono bg-black/30 px-2 py-1 rounded">
                                                {new Date(sh.timestamp * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                            <div className="text-sm text-gray-400">
                                                <div className="text-xs font-bold text-gray-600 uppercase mb-1">Route</div>
                                                <div className="flex items-center gap-2">
                                                    {shortenAddress(sh.sender)} <span className="text-gray-600">→</span> {shortenAddress(sh.receiver)}
                                                </div>
                                            </div>
                                            {sh.vehicleNumber && (
                                                <div className="text-sm text-gray-400">
                                                    <div className="text-xs font-bold text-gray-600 uppercase mb-1">Logistics</div>
                                                    <div className="flex items-center gap-2">
                                                        <Truck size={12} /> {sh.vehicleNumber}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Retail */}
                            {result.status >= 3 && (
                                <div className="relative pl-16 pb-12 group">
                                    <div className="absolute left-3 w-8 h-8 rounded-full bg-[#151921] border-2 border-pink-500 flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                        <Store size={14} className="text-pink-400" />
                                    </div>
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 group-hover:border-pink-500/30 transition-all">
                                        <h4 className="font-bold text-lg text-pink-400 mb-2">At Retail Store</h4>
                                        <p className="text-sm text-gray-400 mb-2">Product reached final retail destination.</p>
                                        <div className="flex items-center gap-2 text-xs text-pink-300 bg-pink-500/10 px-3 py-2 rounded-lg w-fit">
                                            <MapPin size={12} /> Location: {result.batch.location || "Store Shelf"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sold */}
                            {result.status === 4 && (
                                <div className="relative pl-16 group">
                                    <div className="absolute left-3 w-8 h-8 rounded-full bg-[#151921] border-2 border-green-500 flex items-center justify-center z-10 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                        <User size={14} className="text-green-400" />
                                    </div>
                                    <div className="bg-linear-to-br from-green-500/10 to-emerald-900/10 p-5 rounded-2xl border border-green-500/30">
                                        <h4 className="font-bold text-xl text-green-400 mb-1">Purchased & Verified</h4>
                                        <p className="text-sm text-gray-400">End-to-end blockchain verification complete.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Report Button */}
                    <div className="text-center pt-8">
                        <button className="text-sm text-gray-500 hover:text-red-400 transition-colors flex items-center gap-2 mx-auto">
                            <AlertTriangle size={16} /> Report Suspected Counterfeit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
