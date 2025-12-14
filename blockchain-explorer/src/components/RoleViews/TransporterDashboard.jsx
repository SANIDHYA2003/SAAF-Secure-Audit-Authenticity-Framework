import React, { useState, useContext, useEffect } from 'react';
import { AppContext, ROLES, ADDRESSES } from '../../context/AppContext';
import { Truck, MapPin, Thermometer, Loader, Phone, User, Navigation, Activity, CheckCircle, Clock } from "lucide-react";

export default function TransporterDashboard() {
    const { getContract, address } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [transitLog, setTransitLog] = useState({
        temperature: "4.5",
        humidity: "45",
        location: "Highway 99, KM 45"
    });

    // Stats
    const activeShipments = assignments.filter(s => s.status > 0 && s.status < 3).length;
    const pendingPickups = assignments.filter(s => s.status === 0).length;

    useEffect(() => {
        loadData();
    }, [address]);

    const loadData = async () => {
        try {
            const contract = await getContract();
            const myShipmentIds = [];
            let i = 0;
            while (true) {
                try {
                    const sId = await contract.userToShipments(address, i);
                    myShipmentIds.push(sId);
                    i++;
                } catch (e) { break; }
            }

            const loaded = [];
            for (let sId of myShipmentIds) {
                const s = await contract.shipments(sId);
                // Status < 4 means not yet canceled? or delivered. Adjust logic as needed.
                // Assuming 3 is Delivered. 
                if (s.transporter.toLowerCase() === address.toLowerCase() && Number(s.status) < 4) {
                    loaded.push({
                        id: s.id,
                        sender: s.sender,
                        receiver: s.receiver,
                        status: Number(s.status),
                        vehicleNumber: s.vehicleNumber,
                        driverName: s.driverName,
                        driverContact: s.driverContact
                    });
                }
            }
            setAssignments(loaded.reverse());
        } catch (e) {
            console.error("Load error:", e);
            setLogs(p => [`⚠️ Load error: ${e.message}`, ...p]);
        }
    };

    const confirmPickup = async (sId) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.confirmPickup(sId, "Warehouse A");
            await tx.wait();
            setLogs(p => [`✅ Picked up ${sId}`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const logTransit = async (sId) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const logData = `Temp: ${transitLog.temperature}°C | Humidity: ${transitLog.humidity}% | GPS: ${transitLog.location}`;
            const tx = await contract.updateTransitLog(sId, logData, transitLog.location);
            await tx.wait();
            setLogs(p => [`✅ Logged: ${logData}`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const completeDelivery = async (sId) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.completeDelivery(sId, "Destination Dock");
            await tx.wait();
            setLogs(p => [`✅ Delivery Completed ${sId}`, ...p]);
            loadData();
        } catch (err) { setLogs(p => [`❌ Error: ${err.reason || err.message}`, ...p]); }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        if (status === 0) return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">Pending Pickup</span>;
        if (status === 1) return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">Picked Up</span>;
        if (status === 2) return <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">In Transit</span>;
        if (status === 3) return <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">Delivered</span>;
        return <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-400 text-[10px] font-bold">Unknown</span>;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/30 text-white">
                            <Truck size={24} />
                        </span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Transporter Console
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1 ml-1">Fleet tracking, sensor logs, and shipment updates</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold flex items-center gap-2">
                        <Activity size={14} /> Fleet Active
                    </span>
                </div>
            </div>

            {/* Quick Stats */}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                            <Clock size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Pending Pickup</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{pendingPickups}</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                            <Truck size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">In Transit</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{activeShipments}</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Assignments</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{assignments.length}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Assignments */}
                    <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2 relative z-10">
                            <MapPin size={20} className="text-blue-400" /> Active Assignments
                        </h3>

                        {assignments.length === 0 ? (
                            <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                                <Truck size={48} className="mx-auto mb-4 opacity-20 text-gray-400" />
                                <p className="text-gray-400">No active shipments assigned yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative z-10">
                                {assignments.map((s, i) => (
                                    <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:bg-white/5 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-bold text-lg text-blue-300 font-mono flex items-center gap-2">
                                                    {s.id}
                                                    {s.status === 2 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                                    <span className="px-1.5 py-0.5 bg-white/5 rounded text-gray-300">FROM</span> {s.sender.slice(0, 8)}...
                                                    <span className="text-gray-600">→</span>
                                                    <span className="px-1.5 py-0.5 bg-white/5 rounded text-gray-300">TO</span> {s.receiver.slice(0, 8)}...
                                                </div>
                                            </div>
                                            {getStatusBadge(s.status)}
                                        </div>

                                        {/* Vehicle/Driver Details */}
                                        <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Truck size={14} className="text-blue-400" />
                                                    <span className="font-mono">{s.vehicleNumber || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <User size={14} className="text-green-400" />
                                                    <span>{s.driverName || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <Phone size={14} className="text-orange-400" />
                                                    <span>{s.driverContact || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {s.status === 0 &&
                                                <button onClick={() => confirmPickup(s.id)} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all">
                                                    {loading ? <Loader className="animate-spin" size={14} /> : <><Navigation size={14} /> Confirm Pickup</>}
                                                </button>
                                            }
                                            {(s.status === 1 || s.status === 2) &&
                                                <>
                                                    <button onClick={() => logTransit(s.id)} disabled={loading} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 font-medium flex items-center gap-2 border border-white/10 transition-all">
                                                        <Thermometer size={14} className="text-orange-400" /> Update Sensor Data
                                                    </button>
                                                    <button onClick={() => completeDelivery(s.id)} disabled={loading} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all">
                                                        {loading ? <Loader className="animate-spin" size={14} /> : <><CheckCircle size={14} /> Complete Delivery</>}
                                                    </button>
                                                </>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* IOT Form */}
                    <div className="rounded-2xl border border-white/10 bg-[#1a1d26] p-6 shadow-xl relative">
                        <div className="mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-white"><Activity size={18} className="text-orange-400" /> IOT Simulator</h3>
                            <p className="text-xs text-gray-400">Simulate on-board device readings for active shipments.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Temperature (°C)</label>
                                <div className="relative">
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:border-orange-500 outline-none transition-colors font-mono"
                                        type="number" step="0.1" value={transitLog.temperature} onChange={e => setTransitLog({ ...transitLog, temperature: e.target.value })} />
                                    <Thermometer size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Humidity (%)</label>
                                <div className="relative">
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:border-blue-500 outline-none transition-colors font-mono"
                                        type="number" value={transitLog.humidity} onChange={e => setTransitLog({ ...transitLog, humidity: e.target.value })} />
                                    <span className="absolute left-3 top-2.5 text-gray-500 text-xs">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">GPS Coordinates</label>
                                <div className="relative">
                                    <input className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-white focus:border-green-500 outline-none transition-colors font-mono"
                                        value={transitLog.location} onChange={e => setTransitLog({ ...transitLog, location: e.target.value })} />
                                    <Navigation size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <div className="text-[10px] text-gray-500 italic bg-white/5 p-2 rounded">
                                    Values will be written to blockchain when you click "Update Sensor Data" on an active shipment.
                                </div>
                            </div>
                        </div>
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
