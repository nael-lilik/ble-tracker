'use client';

import { useEffect, useState, useMemo } from 'react';
import RoomMap, { Room, ScannerNode, DeviceDetection } from '@/components/RoomMap';

interface Asset {
    id: number;
    name: string;
    macAddress: string;
    type: string;
    isBeacon: boolean;
    description?: string;
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

    // Modal
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [taggingDevice, setTaggingDevice] = useState<DiscoveredDevice | null>(null);
    const [formData, setFormData] = useState({
        macAddress: '', // Needed for manual entry
        name: '',
        type: 'phone',
        isBeacon: false,
        description: ''
    });
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
            if (res.ok) setAssets(await res.json());
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
                if (data.presences && data.presences.length > 0) {
                    setHistoryRoomId(data.presences[0].room.id);
                }
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpenEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormData({
            macAddress: asset.macAddress,
            name: asset.name,
            type: asset.type,
            isBeacon: asset.isBeacon,
            description: asset.description || ''
        });
        setIsRegModalOpen(true);
    };

    const handleOpenTag = (device: DiscoveredDevice) => {
        setTaggingDevice(device);
        setFormData({
            macAddress: device.macAddress,
            name: '',
            type: 'phone',
            isBeacon: false,
            description: ''
        });
        setIsRegModalOpen(true);
    };

    const handleOpenManual = () => {
        setTaggingDevice(null);
        setEditingAsset(null);
        setFormData({
            macAddress: '',
            name: '',
            type: 'phone',
            isBeacon: false,
            description: ''
        });
        setIsRegModalOpen(true);
    };

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const isEditing = !!editingAsset;
            const url = isEditing ? `${API_URL}/api/assets/${editingAsset.id}` : `${API_URL}/api/assets`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsRegModalOpen(false);
                setEditingAsset(null);
                setTaggingDevice(null);
                fetchAssets();
                if (!isEditing) setActiveTab('registered');
            }
        } catch (error) {
            console.error('Error saving asset:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAsset = async (id: number) => {
        if (!confirm('Are you sure you want to delete this asset? Tracking history will be preserved as "Unknown".')) return;
        try {
            const res = await fetch(`${API_URL}/api/assets/${id}`, { method: 'DELETE' });
            if (res.ok) fetchAssets();
        } catch (error) {
            console.error('Error deleting asset:', error);
        }
    };

    const historyPath = useMemo(() => {
        if (!history || !historyRoomId) return [];
        const roomLogs = history.logs.filter(log => log.scannerNode.room.id === historyRoomId);
        if (roomLogs.length === 0) return [];

        const windows: { [key: string]: typeof roomLogs } = {};
        roomLogs.forEach(log => {
            const time = new Date(log.timestamp).getTime();
            const windowKey = Math.floor(time / 10000) * 10000;
            if (!windows[windowKey]) windows[windowKey] = [];
            windows[windowKey].push(log);
        });

        return Object.keys(windows).sort().map(key => {
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const selectedRoom = rooms.find(r => r.id === historyRoomId);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2">Asset <span className="text-blue-600">Vault</span></h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs opacity-60">Complete inventory & signal discovery</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Tab Switcher */}
                    <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] shadow-inner">
                        <button
                            onClick={() => setActiveTab('registered')}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registered' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Registered ({assets.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('discovered')}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discovered' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Signals ({discovered.length})
                        </button>
                    </div>

                    <button
                        onClick={handleOpenManual}
                        className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Manual Entry
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-10">
                <div className="relative max-w-xl group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'registered' ? 'registered identities' : 'unknown signals'}...`}
                        className="w-full pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800 shadow-sm outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List Components */}
            {activeTab === 'registered' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAssets.map((asset) => {
                        const status = getAssetStatus(asset);
                        return (
                            <div key={asset.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(asset)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDeleteAsset(asset.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                <div className="cursor-pointer mb-8" onClick={() => fetchHistory(asset)}>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors mb-1">{asset.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{asset.macAddress}</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${status.status === 'present' ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10' : 'bg-slate-200'}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${status.status === 'present' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {status.status === 'present' ? 'Spatial Active' : 'Offline'}
                                        </span>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-2">Location Context</div>
                                        <div className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase underline decoration-blue-500/30 underline-offset-4">
                                            {status.location}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-slate-50/50 uppercase">
                            <tr>
                                <th className="px-10 py-8 text-left text-[10px] font-black text-slate-400 tracking-[0.2em]">Hardware MAC</th>
                                <th className="px-10 py-8 text-left text-[10px] font-black text-slate-400 tracking-[0.2em]">Latest Detection</th>
                                <th className="px-10 py-8 text-left text-[10px] font-black text-slate-400 tracking-[0.2em]">Intensity</th>
                                <th className="px-10 py-8 text-right text-[10px] font-black text-slate-400 tracking-[0.2em]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold">
                            {filteredDiscovered.map((dev) => (
                                <tr key={dev.macAddress} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-10 py-8 font-mono text-xs text-slate-800">{dev.macAddress}</td>
                                    <td className="px-10 py-8 text-slate-500 text-xs">{new Date(dev.lastSeen).toLocaleTimeString()}</td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (dev.maxRssi + 100) * 2)}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{dev.maxRssi} dBm</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button onClick={() => handleOpenTag(dev)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">Register</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Registration Modal (Shared for Manual/Edit/Tag) */}
            {isRegModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-12 border-b border-slate-50 bg-slate-50">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                                {editingAsset ? 'Update Identity' : (taggingDevice ? 'Onboard Signal' : 'Manual Entry')}
                            </h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] opacity-60">Provision hardware parameters</p>
                        </div>
                        <form onSubmit={handleSaveAsset} className="p-12 space-y-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Hardware MAC Identity</label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editingAsset || !!taggingDevice}
                                    placeholder="00:00:00:00:00:00"
                                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800 disabled:opacity-50 transition-all"
                                    value={formData.macAddress}
                                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Friendly Locator Identifier</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                    placeholder="e.g. Asset #301 - Laptop"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Classification</label>
                                    <select
                                        className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="phone">Smartphone</option>
                                        <option value="laptop">Portable PC</option>
                                        <option value="beacon">Stateless Beacon</option>
                                        <option value="badge">Identity Badge</option>
                                        <option value="equipment">Machine/Equip</option>
                                        <option value="other">Generic Object</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Beacon Logic</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isBeacon: !formData.isBeacon })}
                                        className={`flex-1 px-8 py-5 border rounded-[1.5rem] font-black text-[10px] transition-all uppercase tracking-widest ${formData.isBeacon ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-500/30' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                    >
                                        {formData.isBeacon ? 'Pulsing' : 'Static'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-6 pt-6">
                                <button type="button" onClick={() => setIsRegModalOpen(false)} className="flex-1 px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-colors">Abort</button>
                                <button type="submit" disabled={submitting} className="flex-1 px-8 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/30 hover:bg-blue-600 transition-all active:scale-95">{submitting ? 'Writing...' : (editingAsset ? 'Update Identity' : 'Authorize Asset')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal - Reusing the one from before but kept premium */}
            {selectedAsset && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-500">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight mb-2">{selectedAsset.name}</h2>
                                <p className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-[0.2em]">{selectedAsset.macAddress}</p>
                            </div>
                            <button onClick={() => { setSelectedAsset(null); setHistory(null); }} className="p-4 hover:bg-white/10 rounded-2xl transition-all border border-white/10"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                            <div className="md:w-1/3 overflow-y-auto p-12 border-r border-slate-100 bg-white">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-8">Active Zone Paths</h3>
                                <div className="space-y-4">
                                    {Array.from(new Set(history?.logs.map(l => l.scannerNode.room.id) || [])).map(roomId => {
                                        const room = rooms.find(r => r.id === roomId);
                                        return (
                                            <button key={roomId} onClick={() => setHistoryRoomId(roomId)} className={`w-full p-6 p-6 rounded-[1.5rem] text-left transition-all border-2 ${historyRoomId === roomId ? 'bg-blue-50 border-blue-600 shadow-xl shadow-blue-500/10' : 'bg-white border-transparent text-slate-600 hover:border-slate-100 shadow-sm font-bold'}`}>
                                                <div className="font-black uppercase tracking-tight text-xs mb-1">{room?.name || 'Unknown Room'}</div>
                                                <div className={`text-[9px] uppercase font-black tracking-widest ${historyRoomId === roomId ? 'text-blue-600' : 'text-slate-400'}`}>{history?.logs.filter(l => l.scannerNode.room.id === roomId).length} Signals Logged</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-12 flex flex-col items-center justify-center overflow-hidden">
                                {selectedRoom ? (
                                    <div className="w-full h-full flex flex-col">
                                        <div className="mb-10 text-center font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Spatial Topology: {selectedRoom.name}</div>
                                        <div className="flex-1 w-full bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 overflow-hidden">
                                            <RoomMap room={selectedRoom} scanners={allScanners} devices={[]} historyPath={historyPath} />
                                        </div>
                                    </div>
                                ) : <div className="text-slate-300 font-black uppercase tracking-[0.2em] text-xs">Awaiting Spatial Context Initialization...</div>}
                            </div>
                        </div>
                        <div className="p-8 bg-white border-t border-slate-100 flex justify-center"><button onClick={() => { setSelectedAsset(null); setHistory(null); }} className="px-16 py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20">Authorize Exit</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
