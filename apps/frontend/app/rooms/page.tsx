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

    // Registration Modal (for map tagging)
    const [taggingMac, setTaggingMac] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'phone',
        isBeacon: false,
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (selectedRoom) {
            fetchScanners(selectedRoom.id);
            fetchDevices(selectedRoom.id);

            const interval = setInterval(() => fetchDevices(selectedRoom.id), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedRoom]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/api/rooms`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                if (data.length > 0) setSelectedRoom(data[0]);
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
            if (res.ok) setScanners(await res.json());
        } catch (error) {
            console.error('Error fetching scanners:', error);
        }
    };

    const fetchDevices = async (roomId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/logs?roomId=${roomId}&limit=200`);
            if (res.ok) {
                const logs = await res.json();
                const now = new Date().getTime();
                // Show devices seen in last 2 minutes for a more "alive" map
                const recentLogs = logs.filter((log: any) => {
                    const logTime = new Date(log.timestamp).getTime();
                    return (now - logTime) < 120000;
                });
                setDevices(recentLogs);
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
        }
    };

    const handleDeviceClick = (mac: string, isAsset: boolean) => {
        if (isAsset) return; // Already registered
        setTaggingMac(mac);
        setFormData({ name: '', type: 'phone', isBeacon: false, description: '' });
        setIsModalOpen(true);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, macAddress: taggingMac })
            });
            if (res.ok) {
                setIsModalOpen(false);
                if (selectedRoom) fetchDevices(selectedRoom.id);
            }
        } catch (error) {
            console.error('Error registering asset:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-8 max-w-[1600px] mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-2">Spatial <span className="text-blue-600">Explorer</span></h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs opacity-60">Real-time room topology & device localization</p>
                </div>

                <div className="flex gap-4">
                    <select
                        className="px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-black uppercase tracking-widest text-[10px] text-slate-600 outline-none"
                        value={selectedRoom?.id || ''}
                        onChange={(e) => {
                            const room = rooms.find(r => r.id === parseInt(e.target.value));
                            setSelectedRoom(room || null);
                        }}
                    >
                        {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.site?.name} • {room.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${showHeatmap
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30'
                            : 'bg-white text-slate-600 border border-slate-100'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${showHeatmap ? 'bg-white animate-pulse' : 'bg-blue-500'}`}></div>
                        {showHeatmap ? 'Heatmap Active' : 'Density View'}
                    </button>
                </div>
            </div>

            {/* Room Map Container - Overflow Fixed in RoomMap component + wrapper */}
            {selectedRoom && (
                <div className="flex-1 min-h-0 flex flex-col gap-8">
                    <div className="flex-1 relative bg-white rounded-[3rem] border-8 border-slate-50 shadow-2xl overflow-hidden p-8 flex items-center justify-center">
                        <RoomMap
                            room={selectedRoom}
                            scanners={scanners}
                            devices={devices}
                            showHeatmap={showHeatmap}
                            onDeviceClick={handleDeviceClick}
                        />

                        {/* Map Overlay Stats */}
                        <div className="absolute bottom-8 right-8 flex flex-col gap-3">
                            <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 rounded-3xl text-white shadow-2xl">
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Signals Verified</div>
                                <div className="text-2xl font-black">{[...new Set(devices.map(d => d.macAddress))].length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-8 justify-center bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
                        <LegendItem color="bg-emerald-500" label="Node Online" />
                        <LegendItem color="bg-slate-300" label="Node Offline" />
                        <LegendItem color="bg-blue-600" label="Asset Identity" />
                        <LegendItem color="bg-slate-400" label="Raw Signal" />
                        <div className="text-[9px] font-black text-slate-300 flex items-center uppercase ml-4 border-l pl-8 border-slate-100">Click signal to register asset</div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-10 border-b border-slate-50 bg-slate-50">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-1">Onboard Asset</h2>
                            <p className="text-slate-400 font-mono text-xs opacity-80 uppercase tracking-widest">{taggingMac}</p>
                        </div>

                        <form onSubmit={handleRegister} className="p-10 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Asset Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800"
                                    placeholder="e.g. Warehouse Scanner A"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Classification</label>
                                    <select
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="phone">Smartphone</option>
                                        <option value="laptop">Portable PC</option>
                                        <option value="beacon">Stateless Beacon</option>
                                        <option value="badge">Identity Badge</option>
                                        <option value="equipment">Asset/Equip</option>
                                        <option value="other">Generic Object</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Beacon Logic</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isBeacon: !formData.isBeacon })}
                                        className={`flex-1 px-6 py-4 border rounded-2xl font-black text-xs transition-all uppercase tracking-widest ${formData.isBeacon ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-500/30' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                    >
                                        {formData.isBeacon ? 'Enabled' : 'Disabled'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/30 hover:bg-blue-600 transition-all active:scale-95"
                                >
                                    {submitting ? 'Verification...' : 'Initial Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${color} shadow-sm border-2 border-white`}></div>
            <span className="text-[10px] font-black tracking-widest">{label}</span>
        </div>
    );
}
