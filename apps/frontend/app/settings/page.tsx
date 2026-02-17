'use client';

import { useEffect, useState } from 'react';

interface Room {
    id: number;
    name: string;
    site: { name: string };
}

interface ScannerNode {
    id: number;
    nodeId: string;
    name: string;
    macAddress: string;
    status: string;
    lastSeen: string;
    roomId: number;
    x: number;
    y: number;
    room: {
        name: string;
    };
}

export default function SettingsPage() {
    const [scanners, setScanners] = useState<ScannerNode[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<ScannerNode | null>(null);
    const [formData, setFormData] = useState({
        nodeId: '',
        name: '',
        macAddress: '',
        roomId: 0,
        x: 0,
        y: 0
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchScanners(), fetchRooms()]);
            setLoading(false);
        };
        init();
    }, []);

    const fetchScanners = async () => {
        try {
            const res = await fetch(`${API_URL}/api/nodes`);
            if (res.ok) setScanners(await res.json());
        } catch (error) {
            console.error('Error fetching scanners:', error);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_URL}/api/rooms`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                if (data.length > 0 && formData.roomId === 0) {
                    setFormData(prev => ({ ...prev, roomId: data[0].id }));
                }
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    };

    const handleOpenModal = (node: ScannerNode | null = null) => {
        if (node) {
            setEditingNode(node);
            setFormData({
                nodeId: node.nodeId,
                name: node.name,
                macAddress: node.macAddress || '',
                roomId: node.roomId,
                x: node.x,
                y: node.y
            });
        } else {
            setEditingNode(null);
            setFormData({
                nodeId: '',
                name: '',
                macAddress: '',
                roomId: rooms[0]?.id || 0,
                x: 0,
                y: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingNode ? 'PUT' : 'POST';
            const url = editingNode ? `${API_URL}/api/nodes/${editingNode.id}` : `${API_URL}/api/nodes`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchScanners();
            }
        } catch (error) {
            console.error('Error saving node:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this node?')) return;
        try {
            const res = await fetch(`${API_URL}/api/nodes/${id}`, { method: 'DELETE' });
            if (res.ok) fetchScanners();
        } catch (error) {
            console.error('Error deleting node:', error);
        }
    };

    const toggleStatus = async (node: ScannerNode) => {
        const newStatus = node.status === 'online' ? 'offline' : 'online';
        try {
            await fetch(`${API_URL}/api/nodes/${node.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchScanners();
        } catch (error) {
            console.error('Error toggling status:', error);
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
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">System Settings</h1>
                    <p className="text-slate-500 font-medium">Manage your hardware scanner fleet and environment</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Node
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Scanner Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scanners.map((scanner) => (
                        <div key={scanner.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all group">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${scanner.status === 'online' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}>
                                    {scanner.nodeId.slice(-2).toUpperCase()}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(scanner)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(scanner.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{scanner.name}</h3>
                                <p className="text-xs font-mono text-slate-400 tracking-tighter mb-2">{scanner.macAddress}</p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                                        {scanner.room?.name || 'Unassigned'}
                                    </span>
                                    <span className="text-[10px] text-slate-300 font-bold">
                                        Coord: {scanner.x}m, {scanner.y}m
                                    </span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Health Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${scanner.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                        <span className={`text-xs font-black uppercase tracking-widest ${scanner.status === 'online' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {scanner.status}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleStatus(scanner)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${scanner.status === 'online' ? 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    {scanner.status === 'online' ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* System Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">API Endpoint</div>
                        <div className="font-mono text-xs opacity-80 break-all">{API_URL}</div>
                    </div>
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">DB Status</div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/30"></div>
                            <span className="font-black text-slate-800 uppercase tracking-widest text-xs">MariaDB Active</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active Nodes</div>
                        <div className="text-3xl font-black text-slate-900">{scanners.filter(s => s.status === 'online').length} <span className="text-sm font-medium text-slate-400">/ {scanners.length}</span></div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-10 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">
                                {editingNode ? 'Edit Scanner' : 'Add New Scanner'}
                            </h2>
                            <p className="text-slate-500 font-medium">Configure hardware parameters and location</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Node Identifier (ID)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800"
                                        placeholder="e.g. node-01"
                                        value={formData.nodeId}
                                        onChange={(e) => setFormData({ ...formData, nodeId: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Friendly Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-800"
                                        placeholder="e.g. North Scanner"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Room / Zone</label>
                                    <select
                                        required
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                        value={formData.roomId}
                                        onChange={(e) => setFormData({ ...formData, roomId: parseInt(e.target.value) })}
                                    >
                                        {rooms.map(room => (
                                            <option key={room.id} value={room.id}>{room.site.name} - {room.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">X Coordinate (m)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                        value={formData.x}
                                        onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Y Coordinate (m)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-800"
                                        value={formData.y}
                                        onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/30 hover:bg-slate-800 active:scale-95 transition-all"
                                >
                                    {editingNode ? 'Update Node' : 'Initialize Node'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
