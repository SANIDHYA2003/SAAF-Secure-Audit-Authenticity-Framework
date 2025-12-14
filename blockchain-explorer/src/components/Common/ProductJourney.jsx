import React from 'react';
import { Package, MapPin, Factory, Truck, Store, User, AlertTriangle, ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";

export default function ProductJourney({ result, history }) {
    if (!result) return null;

    const StatusBadge = ({ status }) => {
        if (status === 5) return <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-6 py-3 rounded-full text-lg font-bold"><AlertTriangle size={24} /> RECALLED / UNSAFE</div>;
        if (status === 6) return <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 px-6 py-3 rounded-full text-lg font-bold"><AlertTriangle size={24} /> EXPIRED</div>;
        return <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-3 rounded-full text-lg font-bold"><ShieldCheck size={24} /> AUTHENTIC PRODUCT</div>;
    };

    const getStatusLabel = (status) => {
        const labels = ["Created", "In Transit", "Arrived", "Delivered", "Consumed", "Recalled", "Expired"];
        return labels[status] || "Unknown";
    };

    const shortenAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Status Badge */}
            <div className="flex justify-center">
                <StatusBadge status={result.status} />
            </div>

            {/* Product Info Card */}
            <div className="card border-t-4 border-t-cyan-500 bg-[#1a1b26] p-6 rounded-2xl shadow-xl">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <Package size={32} className="text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">{result.product.name}</h2>
                        <div className="text-sm text-gray-400 uppercase tracking-wider">{result.product.category}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="bg-white/5 p-4 rounded-xl">
                        <span className="block text-gray-400 text-xs uppercase mb-1">Batch ID</span>
                        <span className="font-mono text-lg text-cyan-300">{result.batch.id}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl">
                        <span className="block text-gray-400 text-xs uppercase mb-1">Quantity</span>
                        <span className="font-bold text-2xl text-white">{Number(result.batch.quantity)}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl">
                        <span className="block text-gray-400 text-xs uppercase mb-1">Manufacturing Date</span>
                        <span className="text-white">{new Date(Number(result.batch.mfgDate) * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl">
                        <span className="block text-gray-400 text-xs uppercase mb-1">Current Status</span>
                        <span className="badge badge-primary bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/30">
                            {getStatusLabel(result.status)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Journey Timeline */}
            <div className="card bg-[#1a1b26] p-6 rounded-2xl shadow-xl">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-white">
                    <MapPin className="text-purple-400" /> Complete Journey
                </h3>

                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500"></div>

                    {/* Manufacturing */}
                    <div className="relative pl-16 pb-8">
                        <div className="absolute left-3 w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] z-10">
                            <Factory size={14} className="text-white" />
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-cyan-500/30">
                            <h4 className="font-bold text-cyan-400 mb-1">Manufactured</h4>
                            <p className="text-sm text-gray-400">Created by {shortenAddress(result.product.manufacturer)}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(Number(result.batch.mfgDate) * 1000).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Shipment History */}
                    {history.map((sh, idx) => (
                        <div key={idx} className="relative pl-16 pb-8">
                            <div className="absolute left-3 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center z-10">
                                <Truck size={14} className="text-white" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-blue-500/30">
                                <h4 className="font-bold text-blue-400 mb-1">Shipment {sh.id}</h4>
                                <p className="text-sm text-gray-400">
                                    {shortenAddress(sh.sender)} <ArrowRight size={12} className="inline mx-1" /> {shortenAddress(sh.receiver)}
                                </p>
                                {sh.vehicleNumber && (
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>🚛 {sh.vehicleNumber}</span>
                                        <span>👤 {sh.driverName}</span>
                                    </div>
                                )}
                                <div className="text-xs text-gray-600 mt-1">{new Date(sh.timestamp * 1000).toLocaleString()}</div>
                            </div>
                        </div>
                    ))}

                    {/* Distribution */}
                    {result.status >= 1 && (
                        <div className="relative pl-16 pb-8">
                            <div className="absolute left-3 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center z-10">
                                <Truck size={14} className="text-white" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-orange-500/30">
                                <h4 className="font-bold text-orange-400 mb-1">In Distribution</h4>
                                <p className="text-sm text-gray-400">Handled by logistics partners</p>
                            </div>
                        </div>
                    )}

                    {/* Retail */}
                    {result.status >= 3 && (
                        <div className="relative pl-16 pb-8">
                            <div className="absolute left-3 w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center z-10">
                                <Store size={14} className="text-white" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-pink-500/30">
                                <h4 className="font-bold text-pink-400 mb-1">At Retail Store</h4>
                                <p className="text-sm text-gray-400">Location: {result.batch.location || "Store Shelf"}</p>
                                <p className="text-xs text-gray-500 mt-1">Current Owner: {shortenAddress(result.batch.currentOwner)}</p>
                            </div>
                        </div>
                    )}

                    {/* Sold */}
                    {result.status === 4 && (
                        <div className="relative pl-16">
                            <div className="absolute left-3 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10">
                                <User size={14} className="text-white" />
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-green-500/30">
                                <h4 className="font-bold text-green-400 mb-1">Purchased by Consumer</h4>
                                <p className="text-sm text-gray-400">Verified end-to-end journey complete</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Button */}
            <div className="text-center pb-8">
                <button className="btn btn-ghost text-sm text-gray-400 hover:text-white">
                    <AlertTriangle size={14} /> Report Fake or Issue
                </button>
            </div>
        </div>
    );
}
