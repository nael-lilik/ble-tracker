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
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">BLE Asset Tracking Dashboard</h1>
                <p className="text-gray-600">Real-time monitoring and asset tracking system</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Total Scanners</div>
                    <div className="text-3xl font-bold">{stats.totalScanners}</div>
                    <div className="text-sm text-green-600 mt-2">
                        {stats.onlineScanners} online
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Registered Assets</div>
                    <div className="text-3xl font-bold">{stats.totalAssets}</div>
                    <Link href="/assets" className="text-sm text-blue-600 mt-2 inline-block hover:underline">
                        View all →
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">Recent Detections</div>
                    <div className="text-3xl font-bold">{stats.recentDetections}</div>
                    <div className="text-sm text-gray-600 mt-2">Last 10 scans</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-600 mb-1">System Status</div>
                    <div className="text-3xl font-bold text-green-600">Active</div>
                    <div className="text-sm text-gray-600 mt-2">All systems operational</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner Nodes */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Scanner Nodes</h2>
                    <div className="space-y-3">
                        {scanners.slice(0, 5).map((scanner) => (
                            <div key={scanner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div>
                                    <div className="font-medium">{scanner.name}</div>
                                    <div className="text-sm text-gray-600">{scanner.room.name}</div>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${scanner.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                        ))}
                    </div>
                    <Link href="/rooms" className="text-sm text-blue-600 mt-4 inline-block hover:underline">
                        View room map →
                    </Link>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-3">
                        {recentLogs.map((log) => (
                            <div key={log.id} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                                <div className="flex-1">
                                    <div className="font-mono text-sm">{log.macAddress}</div>
                                    <div className="text-xs text-gray-600">
                                        {log.scannerNode.room.name} • {log.rssi} dBm
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {getTimeAgo(log.timestamp)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/analytics" className="text-sm text-blue-600 mt-4 inline-block hover:underline">
                        View analytics →
                    </Link>
                </div>
            </div>
        </div>
    );
}
