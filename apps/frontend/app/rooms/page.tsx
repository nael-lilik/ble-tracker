'use client';

import { useEffect, useState } from 'react';

import RoomMap, { Room, ScannerNode, DeviceDetection } from '@/components/RoomMap';

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [scanners, setScanners] = useState<ScannerNode[]>([]);
    const [devices, setDevices] = useState<DeviceDetection[]>([]);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (selectedRoom) {
            fetchScanners(selectedRoom.id);
            fetchDevices(selectedRoom.id);

            // Auto-refresh devices every 3 seconds
            const interval = setInterval(() => fetchDevices(selectedRoom.id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedRoom]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/api/rooms`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                if (data.length > 0) {
                    setSelectedRoom(data[0]);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setLoading(false);
        }
    };

    const fetchScanners = async (roomId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/nodes?roomId=${roomId}`);
            if (res.ok) {
                const data = await res.json();
                setScanners(data);
            }
        } catch (error) {
            console.error('Error fetching scanners:', error);
        }
    };

    const fetchDevices = async (roomId: number) => {
        try {
            // Get recent logs for this room (last 30 seconds)
            const res = await fetch(`${API_URL}/api/logs?roomId=${roomId}&limit=100`);
            if (res.ok) {
                const logs = await res.json();

                // Filter recent detections (last 30 seconds)
                const now = new Date().getTime();
                const recentLogs = logs.filter((log: any) => {
                    const logTime = new Date(log.timestamp).getTime();
                    return (now - logTime) < 30000; // 30 seconds
                });

                setDevices(recentLogs);
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Room Map</h1>
                <p className="text-gray-600">Visualize scanner nodes and device positions</p>
            </div>

            {/* Room Selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Room
                </label>
                <select
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={selectedRoom?.id || ''}
                    onChange={(e) => {
                        const room = rooms.find(r => r.id === parseInt(e.target.value));
                        setSelectedRoom(room || null);
                    }}
                >
                    {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                            {room.site?.name} - {room.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Controls */}
            <div className="mb-6 flex gap-4">
                <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${showHeatmap
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                        }`}
                >
                    {showHeatmap ? '🔥 Heatmap Active' : '📊 Show Heatmap'}
                </button>
            </div>

            {/* Room Map Canvas */}
            {selectedRoom && (
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex items-center justify-center overflow-auto">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                        <RoomMap
                            room={selectedRoom}
                            scanners={scanners}
                            devices={devices}
                            showHeatmap={showHeatmap}
                        />
                    </div>
                </div>
            )}

            {/* Map Legend */}
            {selectedRoom && (
                <div className="mt-6 flex flex-wrap gap-6 justify-center bg-white p-4 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span>Scanner Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                        <span>Scanner Offline</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Registered Asset</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        <span>Unknown Device</span>
                    </div>
                </div>
            )}
        </div>
    );
}
