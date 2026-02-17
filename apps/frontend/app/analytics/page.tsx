'use client';

import { useEffect, useState } from 'react';

interface RoomOccupancy {
    roomName: string;
    deviceCount: number;
    timestamp: string;
}

interface ScannerStats {
    name: string;
    totalScans: number;
    uptime: number;
    status: string;
}

export default function AnalyticsPage() {
    const [occupancyData, setOccupancyData] = useState<RoomOccupancy[]>([]);
    const [scannerStats, setScannerStats] = useState<ScannerStats[]>([]);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch recent logs for occupancy trends
            const logsRes = await fetch(`${API_URL}/api/logs?limit=100`);
            if (logsRes.ok) {
                const logs = await logsRes.json();
                processOccupancyData(logs);
            }

            // Fetch scanner stats
            const scannersRes = await fetch(`${API_URL}/api/nodes`);
            if (scannersRes.ok) {
                const scanners = await scannersRes.json();
                processScannerStats(scanners);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    };

    const processOccupancyData = (logs: any[]) => {
        // Group by room and count unique devices
        const roomCounts: { [key: string]: Set<string> } = {};

        logs.forEach(log => {
            const roomName = log.scannerNode.room.name;
            if (!roomCounts[roomName]) {
                roomCounts[roomName] = new Set();
            }
            roomCounts[roomName].add(log.macAddress);
        });

        const data = Object.entries(roomCounts).map(([roomName, macs]) => ({
            roomName,
            deviceCount: macs.size,
            timestamp: new Date().toISOString()
        }));

        setOccupancyData(data);
    };

    const processScannerStats = (scanners: any[]) => {
        const stats = scanners.map(scanner => {
            const lastSeen = new Date(scanner.lastSeen);
            const now = new Date();
            const uptimeHours = scanner.status === 'online'
                ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60))
                : 0;

            return {
                name: scanner.name,
                totalScans: 0, // Would need to query device_logs
                uptime: uptimeHours,
                status: scanner.status
            };
        });

        setScannerStats(stats);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    const maxDeviceCount = Math.max(...occupancyData.map(d => d.deviceCount), 1);

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                <p className="text-gray-600">System performance and tracking insights</p>
            </div>

            {/* Room Occupancy Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Room Occupancy</h2>
                <div className="space-y-4">
                    {occupancyData.map((data) => (
                        <div key={data.roomName}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{data.roomName}</span>
                                <span className="text-sm text-gray-600">{data.deviceCount} devices</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6">
                                <div
                                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold transition-all duration-500"
                                    style={{ width: `${(data.deviceCount / maxDeviceCount) * 100}%` }}
                                >
                                    {data.deviceCount > 0 && data.deviceCount}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {occupancyData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No data available
                    </div>
                )}
            </div>

            {/* Scanner Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Scanner Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scannerStats.map((scanner) => (
                        <div key={scanner.name} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">{scanner.name}</h3>
                                <div className={`w-3 h-3 rounded-full ${scanner.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`font-medium ${scanner.status === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                                        {scanner.status}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Uptime:</span>
                                    <span className="font-medium">{scanner.uptime}h</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {scannerStats.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No scanners found
                    </div>
                )}
            </div>
        </div>
    );
}
