'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ScannerNode {
    id: string;
    name: string;
    macAddress: string;
    status: string;
    lastSeen: string;
    room: {
        name: string;
        site: {
            name: string;
        };
    };
}

interface DeviceLog {
    id: string;
    macAddress: string;
    rssi: number;
    timestamp: string;
    isAsset: boolean;
    scannerNode: {
        name: string;
        room: {
            name: string;
        };
    };
}

interface Stats {
    totalScanners: number;
    onlineScanners: number;
    totalAssets: number;
    recentDetections: number;
}

export default function Home() {
    const [scanners, setScanners] = useState<ScannerNode[]>([]);
    const [recentLogs, setRecentLogs] = useState<DeviceLog[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalScanners: 0,
        onlineScanners: 0,
        totalAssets: 0,
        recentDetections: 0
    });
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [scannersRes, logsRes, assetsRes] = await Promise.all([
                fetch(`${API_URL}/api/nodes`),
                fetch(`${API_URL}/api/logs?limit=10`),
                fetch(`${API_URL}/api/assets`)
            ]);

            if (scannersRes.ok) {
                const scannersData = await scannersRes.json();
                setScanners(scannersData);
                setStats(prev => ({
                    ...prev,
                    totalScanners: scannersData.length,
                    onlineScanners: scannersData.filter((s: ScannerNode) => s.status === 'online').length
                }));
            }

            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setRecentLogs(logsData);
                setStats(prev => ({
                    ...prev,
                    recentDetections: logsData.length
                }));
            }

            if (assetsRes.ok) {
                const assetsData = await assetsRes.json();
                setStats(prev => ({
                    ...prev,
                    totalAssets: assetsData.length
                }));
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2">Operational <span className="text-blue-600">Center</span></h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs opacity-60">Real-time BLE Intelligence & Asset Monitoring Dashboard</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <StatCard
                    label="Scanner Fleet"
                    value={stats.totalScanners}
                    sub={`${stats.onlineScanners} ACTIVE`}
                    color="text-emerald-500"
                />
                <StatCard
                    label="Tracked Assets"
                    value={stats.totalAssets}
                    sub="REGISTERED"
                    href="/assets"
                    color="text-blue-500"
                />
                <StatCard
                    label="Burst Activity"
                    value={stats.recentDetections}
                    sub="LAST 10 SIGNALS"
                    color="text-orange-500"
                />
                <StatCard
                    label="System Global"
                    value="100%"
                    sub="ALL OPERATIONAL"
                    color="text-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Node Status Board */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Node Topology</h2>
                        <Link href="/rooms" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:pl-2 transition-all">
                            Live Map →
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {scanners.slice(0, 5).map((scanner) => (
                            <div key={scanner.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${scanner.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <div>
                                        <div className="font-black text-slate-800 uppercase tracking-tight text-sm">{scanner.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{scanner.room.name}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black uppercase text-slate-400">
                                    {scanner.status === 'online' ? 'Connected' : 'Disconnected'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Signal Stream</h2>
                        <Link href="/analytics" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:pl-2 transition-all">
                            Historical →
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${log.isAsset ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-400'}`}>
                                        {log.macAddress.slice(-2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-mono text-xs font-bold text-slate-700">{log.macAddress}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {log.scannerNode.room.name} • <span className="text-blue-500">{log.rssi}dBm</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {getTimeAgo(log.timestamp)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, href, color }: { label: string, value: string | number, subText?: string, sub?: string, href?: string, color: string }) {
    const content = (
        <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{label}</div>
            <div className={`text-5xl font-black mb-2 tracking-tighter ${color}`}>{value}</div>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{sub}</div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }

    return content;
}
