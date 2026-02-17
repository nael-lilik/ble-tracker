'use client';

import { useEffect, useState } from 'react';

interface Asset {
    id: number;
    name: string;
    macAddress: string;
    type: string;
    isBeacon: boolean;
    assetPresences: Array<{
        room: {
            name: string;
            site: {
                name: string;
            };
        };
        lastSeenAt: string;
        exitedAt: string | null;
    }>;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchAssets();
        const interval = setInterval(fetchAssets, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await fetch(`${API_URL}/api/assets`);
            if (res.ok) {
                const data = await res.json();
                setAssets(data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setLoading(false);
        }
    };

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAssetStatus = (asset: Asset) => {
        const activePresence = asset.assetPresences.find(p => !p.exitedAt);
        if (activePresence) {
            return {
                status: 'present',
                location: `${activePresence.room.site.name} - ${activePresence.room.name}`,
                lastSeen: new Date(activePresence.lastSeenAt)
            };
        }
        return { status: 'absent', location: 'Not detected', lastSeen: null };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Assets</h1>
                <p className="text-gray-600">Manage and track registered assets</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search assets by name or MAC address..."
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map((asset) => {
                    const status = getAssetStatus(asset);
                    return (
                        <div
                            key={asset.id}
                            className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">{asset.name}</h3>
                                    <p className="text-sm text-gray-600 font-mono">{asset.macAddress}</p>
                                </div>
                                {asset.isBeacon && (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                        Beacon
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${status.status === 'present' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <span className="text-sm font-medium">
                                        {status.status === 'present' ? 'Present' : 'Not Detected'}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-600">
                                    <div className="font-medium">Location:</div>
                                    <div>{status.location}</div>
                                </div>

                                {status.lastSeen && (
                                    <div className="text-xs text-gray-400">
                                        Last seen: {status.lastSeen.toLocaleString()}
                                    </div>
                                )}

                                {asset.type && (
                                    <div className="text-sm text-gray-600">
                                        Type: <span className="font-medium">{asset.type}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredAssets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No assets found
                </div>
            )}
        </div>
    );
}
