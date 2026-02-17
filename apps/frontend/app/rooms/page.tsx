'use client';

import { useEffect, useState } from 'react';

interface Room {
    id: number;
    name: string;
    width: number;
    height: number;
    scale: number;
    site: {
        name: string;
    };
}

interface ScannerNode {
    id: number;
    name: string;
    x: number;
    y: number;
    status: string;
    macAddress: string;
}

interface DeviceDetection {
    macAddress: string;
    rssi: number;
    scannerNodeId: number;
    isAsset: boolean;
    timestamp: string;
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [scanners, setScanners] = useState<ScannerNode[]>([]);
    const [devices, setDevices] = useState<DeviceDetection[]>([]);
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
            <div className="flex items-center justify-center h-full">
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
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedRoom?.id || ''}
                    onChange={(e) => {
                        const room = rooms.find(r => r.id === parseInt(e.target.value));
                        setSelectedRoom(room || null);
                    }}
                >
                    {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                            {room.site.name} - {room.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Room Map Canvas */}
            {selectedRoom && (
                <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
                    <RoomMap
                        room={selectedRoom}
                        scanners={scanners}
                        devices={devices}
                    />
                </div>
            )}
        </div>
    );
}

interface RoomMapProps {
    room: Room;
    scanners: ScannerNode[];
    devices: DeviceDetection[];
}

function RoomMap({ room, scanners, devices }: RoomMapProps) {
    const canvasRef = useState<HTMLCanvasElement | null>(null);
    const [canvas, setCanvas] = canvasRef;

    // Calculate device position based on RSSI from multiple scanners
    const estimateDevicePosition = (macAddress: string) => {
        const deviceLogs = devices.filter(d => d.macAddress === macAddress);

        if (deviceLogs.length === 0) return null;

        // Simple weighted average based on RSSI
        let totalX = 0;
        let totalY = 0;
        let totalWeight = 0;

        deviceLogs.forEach(log => {
            const scanner = scanners.find(s => s.id === log.scannerNodeId);
            if (scanner) {
                // Convert RSSI to weight (closer = stronger signal = higher weight)
                // RSSI typically ranges from -30 (very close) to -100 (far)
                const weight = Math.pow(10, (log.rssi + 100) / 20);

                totalX += scanner.x * weight;
                totalY += scanner.y * weight;
                totalWeight += weight;
            }
        });

        if (totalWeight === 0) return null;

        return {
            x: totalX / totalWeight,
            y: totalY / totalWeight,
            rssi: Math.max(...deviceLogs.map(d => d.rssi)),
            isAsset: deviceLogs[0].isAsset
        };
    };

    useEffect(() => {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw room background
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw room border
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Draw detected devices
        const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
        uniqueMacs.forEach(mac => {
            const position = estimateDevicePosition(mac);
            if (position) {
                const x = position.x * room.scale;
                const y = position.y * room.scale;

                // Device circle
                ctx.fillStyle = position.isAsset ? '#3b82f6' : '#9ca3af';
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();

                // Device border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1.0;

                // Device label (last 4 chars of MAC)
                ctx.fillStyle = '#1f2937';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(mac.slice(-5), x, y - 12);
            }
        });

        // Draw scanner nodes (on top of devices)
        scanners.forEach((scanner) => {
            const x = scanner.x * room.scale;
            const y = scanner.y * room.scale;

            // Scanner circle
            ctx.fillStyle = scanner.status === 'online' ? '#10b981' : '#6b7280';
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, 2 * Math.PI);
            ctx.fill();

            // Scanner border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Scanner label
            ctx.fillStyle = '#1f2937';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scanner.name, x, y + 30);
        });

    }, [canvas, room, scanners, devices]);

    const canvasWidth = room.width * room.scale;
    const canvasHeight = room.height * room.scale;

    // Count unique devices
    const uniqueDevices = new Set(devices.map(d => d.macAddress)).size;
    const assetCount = new Set(devices.filter(d => d.isAsset).map(d => d.macAddress)).size;

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4">
                <h3 className="text-lg font-semibold">{room.name}</h3>
                <p className="text-sm text-gray-600">
                    {room.width}m × {room.height}m | {scanners.length} scanner(s) | {uniqueDevices} device(s) detected
                </p>
            </div>
            <canvas
                ref={setCanvas}
                width={canvasWidth}
                height={canvasHeight}
                className="border-2 border-gray-300 rounded-lg"
            />
            <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span>Online Scanner</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                    <span>Offline Scanner</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span>Registered Asset ({assetCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <span>Unknown Device ({uniqueDevices - assetCount})</span>
                </div>
            </div>
        </div>
    );
}
