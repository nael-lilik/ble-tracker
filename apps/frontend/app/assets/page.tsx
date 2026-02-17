'use client';

import { useEffect, useState, useMemo } from 'react';
import RoomMap, { Room, ScannerNode, DeviceDetection } from '@/components/RoomMap';

interface Asset {
    id: number;
    name: string;
    macAddress: string;
    type: string;
    isBeacon: boolean;
    assetPresences: Array<{
        room: {
            id: number;
            name: string;
            site: {
                name: string;
            };
        };
        lastSeenAt: string;
        exitedAt: string | null;
    }>;
}

interface AssetHistory {
    asset: Asset;
    presences: Array<{
        id: number;
        enteredAt: string;
        exitedAt: string | null;
        room: {
            id: number;
            name: string;
            site: { name: string };
        };
    }>;
    logs: Array<{
        id: number;
        timestamp: string;
        rssi: number;
        scannerNodeId: number;
        scannerNode: {
            id: number;
            name: string;
            room: { id: number, name: string };
        };
    }>;
}

interface DiscoveredDevice {
    macAddress: string;
    lastSeen: string;
    maxRssi: number;
    scannerName: string;
    roomName: string;
}

export default function AssetsPage() {
    const [activeTab, setActiveTab] = useState<'registered' | 'discovered'>('registered');
    const [assets, setAssets] = useState<Asset[]>([]);
    const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [allScanners, setAllScanners] = useState<ScannerNode[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [discoveredLoading, setDiscoveredLoading] = useState(false);

    // Details/History
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [history, setHistory] = useState<AssetHistory | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRoomId, setHistoryRoomId] = useState<number | null>(null);

    // Tagging Modal
    const [taggingDevice, setTaggingDevice] = useState<DiscoveredDevice | null>(null);
    const [tagName, setTagName] = useState('');
    const [tagType, setTagType] = useState('phone');
    const [isBeacon, setIsBeacon] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchAssets(), fetchRooms(), fetchAllScanners()]);
            setLoading(false);
        };
        init();

        const interval = setInterval(() => {
            if (activeTab === 'registered') fetchAssets();
            else fetchDiscovered();
        }, 10000);

        return () => clearInterval(interval);
    }, [activeTab]);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`${API_URL}/api/assets`);
            if (res.ok) {
                const data = await res.json();
                setAssets(data);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/api/rooms`);
            if (res.ok) setRooms(await res.json());
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    };

    const fetchAllScanners = async () => {
        try {
            const res = await fetch(`${API_URL}/api/nodes`);
            if (res.ok) setAllScanners(await res.json());
        } catch (error) {
            console.error('Error fetching scanners:', error);
        }
    };

    const fetchDiscovered = async () => {
        setDiscoveredLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/logs/discovered?hours=24`);
            if (res.ok) setDiscovered(await res.json());
        } catch (error) {
            console.error('Error fetching discovered devices:', error);
        } finally {
            setDiscoveredLoading(false);
        }
    };

    const fetchHistory = async (asset: Asset) => {
        setHistoryLoading(true);
        setSelectedAsset(asset);
        try {
            const res = await fetch(`${API_URL}/api/assets/${asset.id}/history`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
                // Set default room to the most recent presence
                if (data.presences && data.presences.length > 0) {
                    setHistoryRoomId(data.presences[0].room.id);
                } else if (data.logs && data.logs.length > 0) {
                    setHistoryRoomId(data.logs[0].scannerNode.room.id);
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleTagAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taggingDevice || !tagName) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    macAddress: taggingDevice.macAddress,
                    name: tagName,
                    type: tagType,
                    isBeacon: isBeacon
                })
            });

            if (res.ok) {
                setTaggingDevice(null);
                setTagName('');
                setActiveTab('registered');
                fetchAssets();
            }
        } catch (error) {
            console.error('Error tagging asset:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Path for the selected room
    const historyPath = useMemo(() => {
        if (!history || !historyRoomId) return [];

        const roomLogs = history.logs.filter(log => log.scannerNode.room.id === historyRoomId);
        if (roomLogs.length === 0) return [];

        // Group logs by 10-second windows to estimate position points
        const windows: { [key: string]: typeof roomLogs } = {};
        roomLogs.forEach(log => {
            const time = new Date(log.timestamp).getTime();
            const windowKey = Math.floor(time / 10000) * 10000;
            if (!windows[windowKey]) windows[windowKey] = [];
            windows[windowKey].push(log);
        });

        // Estimate position for each window
        const points = Object.keys(windows).sort().map(key => {
            const logs = windows[key];
            let totalX = 0, totalY = 0, totalWeight = 0;

            logs.forEach(log => {
                const scanner = allScanners.find(s => s.id === log.scannerNodeId);
                if (scanner) {
                    const weight = Math.pow(10, (log.rssi + 100) / 20);
                    totalX += scanner.x * weight;
                    totalY += scanner.y * weight;
                    totalWeight += weight;
                }
            });

            if (totalWeight === 0) return null;
            return { x: totalX / totalWeight, y: totalY / totalWeight, timestamp: new Date(parseInt(key)).toISOString() };
        }).filter(p => p !== null) as { x: number; y: number; timestamp: string }[];

        return points;
    }, [history, historyRoomId, allScanners]);

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDiscovered = discovered.filter(dev =>
        dev.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.roomName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAssetStatus = (asset: Asset) => {
        const activePresence = asset.assetPresences.find((p: any) => !p.exitedAt);
        if (activePresence) {
            return {
                status: 'present',
                location: `${activePresence.room.site.name} - ${activePresence.room.name}`,
                lastSeen: new Date(activePresence.lastSeenAt)
            };
        }
        return { status: 'absent', location: 'Not detected', lastSeen: null };
    };

    if (loading && activeTab === 'registered') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    const selectedRoom = rooms.find(r => r.id === historyRoomId);
    const roomScanners = allScanners.filter(s => s.status === 'online' && historyRoomId !== null); // Simplified for history view

    return (
        <div className="p-8">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Assets & Discovery</h1>
                    <p className="text-gray-600">Manage registered assets and tag new devices</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-200 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('registered')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'registered' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Registered ({assets.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('discovered')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'discovered' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Discovered ({discovered.length})
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder={`Search ${activeTab === 'registered' ? 'assets' : 'discovered devices'}...`}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Content Area */}
            {activeTab === 'registered' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map((asset) => {
                        const status = getAssetStatus(asset);
                        return (
                            <div
                                key={asset.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                                onClick={() => fetchHistory(asset)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors uppercase tracking-tight">{asset.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono tracking-widest">{asset.macAddress}</p>
                                    </div>
                                    {asset.isBeacon && (
                                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-purple-100 text-purple-700 shadow-sm border border-purple-200">
                                            Beacon
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${status.status === 'present' ? 'bg-green-500 animate-pulse ring-4 ring-green-500/20' : 'bg-gray-300'}`} />
                                        <span className={`text-sm font-black uppercase tracking-widest ${status.status === 'present' ? 'text-green-600' : 'text-gray-400'}`}>
                                            {status.status === 'present' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Current Room</div>
                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {status.location}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-50 text-[10px] text-blue-600 font-black uppercase tracking-widest group-hover:pl-2 transition-all">
                                    Track History & Path →
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {discoveredLoading && discovered.length === 0 ? (
                        <div className="py-20 text-center text-gray-500 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                            <span className="font-bold text-sm uppercase tracking-widest">Scanning Bluetooth Spectrum...</span>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">MAC Address</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Last Detection</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Max Signal</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Approx. Location</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Register</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredDiscovered.map((dev) => (
                                    <tr key={dev.macAddress} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-gray-900">{dev.macAddress}</td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">{new Date(dev.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full font-black text-[10px] uppercase ${dev.maxRssi > -60 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {dev.maxRssi} dBm
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{dev.roomName}</div>
                                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">via {dev.scannerName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setTaggingDevice(dev);
                                                    setTagName('');
                                                    setTagType('phone');
                                                    setIsBeacon(false);
                                                }}
                                                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 hover:shadow-blue-500/20"
                                            >
                                                TAG NOW
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {filteredDiscovered.length === 0 && !discoveredLoading && (
                        <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">Zero unknown devices in range.</div>
                    )}
                </div>
            )}

            {/* Tagging Modal (Keeping as is but unified style) */}
            {taggingDevice && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            <h2 className="text-2xl font-black mb-1">Tag Device</h2>
                            <p className="text-blue-100 font-mono text-xs opacity-80 uppercase tracking-tighter">{taggingDevice.macAddress}</p>
                        </div>

                        <form onSubmit={handleTagAsset} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Asset Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                    placeholder="e.g. Employee Smartphone"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Device Type</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                        value={tagType}
                                        onChange={(e) => setTagType(e.target.value)}
                                    >
                                        <option value="phone">Phone</option>
                                        <option value="laptop">Laptop</option>
                                        <option value="beacon">Beacon</option>
                                        <option value="badge">Badge</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Is Beacon?</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsBeacon(!isBeacon)}
                                        className={`flex-1 px-4 py-3 border rounded-xl font-bold text-sm transition-all ${isBeacon ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                    >
                                        {isBeacon ? 'YES' : 'NO'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setTaggingDevice(null)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {submitting ? 'SAVING...' : 'REGISTER ASSET'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal (ENHANCED WITH PATH MAP) */}
            {selectedAsset && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight mb-1">{selectedAsset.name}</h2>
                                <p className="text-xs text-blue-100 font-mono opacity-80">{selectedAsset.macAddress}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedAsset(null);
                                    setHistory(null);
                                    setHistoryRoomId(null);
                                }}
                                className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-white/10 shadow-inner active:scale-95"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Side: Stats & List */}
                            <div className="md:w-1/3 overflow-y-auto p-8 border-r border-gray-100 bg-gray-50/50">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : history ? (
                                    <div className="space-y-8">
                                        {/* Room Selector for Path */}
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Select Room to View Path</h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {Array.from(new Set(history.logs.map(l => l.scannerNode.room.id))).map(roomId => {
                                                    const room = rooms.find(r => r.id === roomId);
                                                    const isActive = historyRoomId === roomId;
                                                    return (
                                                        <button
                                                            key={roomId}
                                                            onClick={() => setHistoryRoomId(roomId)}
                                                            className={`p-4 rounded-2xl text-left transition-all border ${isActive ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
                                                        >
                                                            <div className="font-bold">{room?.name || 'Unknown Room'}</div>
                                                            <div className={`text-[10px] uppercase font-black tracking-tighter ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                                                                {history.logs.filter(l => l.scannerNode.room.id === roomId).length} Recent detections
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Movement Transitions</h3>
                                            <div className="space-y-4">
                                                {history.presences.length > 0 ? history.presences.map((p: any) => (
                                                    <div key={p.id} className="relative pl-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-blue-100 last:before:hidden">
                                                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                                            <div className="font-bold text-gray-900">{p.room.name}</div>
                                                            <div className="mt-2 flex flex-col gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                                <div>IN: {new Date(p.enteredAt).toLocaleString()}</div>
                                                                {p.exitedAt && <div>OUT: {new Date(p.exitedAt).toLocaleString()}</div>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-bold text-xs">No movements recorded.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Right Side: Map Visualization */}
                            <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center overflow-auto relative">
                                {selectedRoom ? (
                                    <div className="w-full flex flex-col items-center">
                                        <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6">Historical Movement Path</h3>
                                        <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100 shadow-inner">
                                            <RoomMap
                                                room={selectedRoom}
                                                scanners={allScanners.filter(s => s.status === 'online')} // Simplified
                                                devices={[]} // We pass path instead
                                                historyPath={historyPath}
                                            />
                                        </div>

                                        <div className="mt-8 grid grid-cols-2 gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40"></div>
                                                <span>Estimated Point</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/40"></div>
                                                <span>Current Endpoint</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Select a room to visualize movement</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                            <button
                                onClick={() => {
                                    setSelectedAsset(null);
                                    setHistory(null);
                                    setHistoryRoomId(null);
                                }}
                                className="px-12 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-all shadow-sm active:scale-95"
                            >
                                Close Activity Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
