'use client';

import { useEffect, useRef, useState } from 'react';

export interface Room {
    id: number;
    name: string;
    width: number;
    height: number;
    scale: number;
    site?: {
        name: string;
    };
}

export interface ScannerNode {
    id: number;
    name: string;
    x: number;
    y: number;
    status: string;
    macAddress?: string;
}

export interface DeviceDetection {
    macAddress: string;
    rssi: number;
    scannerNodeId: number;
    isAsset: boolean;
    timestamp: string;
    assetName?: string;
    assetType?: string;
    manufacturer?: string;
    typeGuess?: string;
}

interface RoomMapProps {
    room: Room;
    scanners: ScannerNode[];
    devices: DeviceDetection[];
    showHeatmap?: boolean;
    historyPath?: { x: number; y: number; timestamp: string }[];
    onDeviceClick?: (mac: string, isAsset: boolean) => void;
}

export default function RoomMap({
    room,
    scanners,
    devices,
    showHeatmap = false,
    historyPath = [],
    onDeviceClick
}: RoomMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredMac, setHoveredMac] = useState<string | null>(null);
    const [history, setHistory] = useState<Record<string, { x: number; y: number }[]>>({});
    const smoothedPosRef = useRef<Record<string, { x: number; y: number }>>({});

    const SMOOTHING_FACTOR = 0.25; // 0 to 1, lower = smoother but slower to follow
    const MAX_BREADCRUMBS = 10;

    // Color mapping for device types
    const getTypeColor = (type?: string, isAsset?: boolean) => {
        if (!isAsset) return '#94a3b8'; // Slate Gray for non-assets

        switch (type) {
            case 'phone': return '#3b82f6'; // Blue
            case 'laptop': return '#8b5cf6'; // Purple
            case 'beacon': return '#6366f1'; // Indigo
            case 'badge': return '#ec4899'; // Pink
            case 'equipment': return '#f59e0b'; // Amber
            default: return '#10b981'; // Emerald for generic assets
        }
    };

    // Calculate device position based on RSSI from multiple scanners
    const estimateDevicePosition = (macAddress: string) => {
        const deviceLogs = devices.filter(d => d.macAddress === macAddress);
        if (deviceLogs.length === 0) return null;

        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;

        deviceLogs.forEach(log => {
            const scanner = scanners.find(s => s.id === log.scannerNodeId);
            if (scanner) {
                // Log-distance path loss model approximation for weight
                // rssi = -60 - 10 * n * log10(d) -> d = 10^((MeasuredPower - RSSI) / (10 * n))
                // n (Path loss exponent) is typically 2-4
                const distance = Math.pow(10, (-55 - log.rssi) / 25);
                const weight = 1 / Math.max(0.1, distance); // Inverse distance weighting

                weightedX += scanner.x * weight;
                weightedY += scanner.y * weight;
                totalWeight += weight;
            }
        });

        if (totalWeight === 0) return null;

        let rawX = weightedX / totalWeight;
        let rawY = weightedY / totalWeight;

        // Apply Low Pass Filter (Smoothing)
        const prevPos = smoothedPosRef.current[macAddress];
        let finalX = rawX;
        let finalY = rawY;

        if (prevPos) {
            finalX = prevPos.x + (rawX - prevPos.x) * SMOOTHING_FACTOR;
            finalY = prevPos.y + (rawY - prevPos.y) * SMOOTHING_FACTOR;
        }

        smoothedPosRef.current[macAddress] = { x: finalX, y: finalY };

        return {
            x: finalX,
            y: finalY,
            rssi: Math.max(...deviceLogs.map(d => d.rssi)),
            isAsset: deviceLogs[0].isAsset,
            type: deviceLogs[0].assetType || deviceLogs[0].typeGuess,
            name: deviceLogs[0].assetName,
            manufacturer: deviceLogs[0].manufacturer,
            typeGuess: deviceLogs[0].typeGuess
        };
    };

    // Update history for breadcrumbs
    useEffect(() => {
        const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
        const newHistory = { ...history };
        let changed = false;

        uniqueMacs.forEach(mac => {
            const pos = estimateDevicePosition(mac);
            if (pos && pos.isAsset) { // Only track trails for assets to keep UI clean
                const deviceHistory = newHistory[mac] || [];
                const lastPoint = deviceHistory[deviceHistory.length - 1];

                // Only add if position moved significantly (>10cm)
                if (!lastPoint || Math.abs(lastPoint.x - pos.x) > 0.1 || Math.abs(lastPoint.y - pos.y) > 0.1) {
                    const updatedDeviceHistory = [...deviceHistory, { x: pos.x, y: pos.y }].slice(-MAX_BREADCRUMBS);
                    newHistory[mac] = updatedDeviceHistory;
                    changed = true;
                }
            }
        });

        if (changed) {
            setHistory(newHistory);
        }
    }, [devices]);

    const drawIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, type?: string, color: string = '#3b82f6', size: number = 24) => {
        ctx.save();
        ctx.translate(x, y);

        // Background shadow for icon
        ctx.beginPath();
        ctx.arc(0, 0, size / 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();

        // Icon circle
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `${color}44`;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw simple symbolic icons based on type
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (type === 'phone') {
            ctx.roundRect(-4, -6, 8, 12, 1);
        } else if (type === 'laptop') {
            ctx.roundRect(-7, -4, 14, 8, 1);
            ctx.fillRect(-8, 4, 16, 2);
        } else if (type === 'beacon') {
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
        } else {
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.restore();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Premium Grid
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Draw Heatmap
        if (showHeatmap) {
            const tileSize = 30;
            const cols = Math.ceil(canvas.width / tileSize);
            const rows = Math.ceil(canvas.height / tileSize);
            const grid = Array(rows).fill(0).map(() => Array(cols).fill(0));

            const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
            uniqueMacs.forEach(mac => {
                const pos = estimateDevicePosition(mac);
                if (pos) {
                    const gridX = Math.floor((pos.x * room.scale) / tileSize);
                    const gridY = Math.floor((pos.y * room.scale) / tileSize);
                    if (gridY >= 0 && gridY < rows && gridX >= 0 && gridX < cols) {
                        grid[gridY][gridX]++;
                    }
                }
            });

            let maxCount = 0;
            grid.forEach(row => row.forEach(val => maxCount = Math.max(maxCount, val)));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c] > 0) {
                        const intensity = grid[r][c] / maxCount;
                        ctx.fillStyle = `rgba(37, 99, 235, ${intensity * 0.4})`;
                        ctx.beginPath();
                        ctx.arc(c * tileSize + tileSize / 2, r * tileSize + tileSize / 2, tileSize / 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw Movement Trails (Multi-device)
        Object.entries(history).forEach(([mac, path]) => {
            if (path.length > 1) {
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';

                path.forEach((p, i) => {
                    const x = p.x * room.scale;
                    const y = p.y * room.scale;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw breadcrumb dots
                path.forEach((p, i) => {
                    if (i === path.length - 1) return; // Latest pos is drawn as icon
                    const x = p.x * room.scale;
                    const y = p.y * room.scale;
                    ctx.fillStyle = `rgba(37, 99, 235, ${0.1 + (i / path.length) * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        });

        // Draw Single History Path (if provided via prop, e.g. from analytics)
        if (historyPath && historyPath.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            historyPath.forEach((p, i) => {
                const x = p.x * room.scale;
                const y = p.y * room.scale;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Devices (Real-time)
        if (historyPath.length === 0) {
            const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
            uniqueMacs.forEach(mac => {
                const pos = estimateDevicePosition(mac);
                if (pos) {
                    const x = pos.x * room.scale;
                    const y = pos.y * room.scale;
                    const isHovered = hoveredMac === mac;
                    const color = getTypeColor(pos.type, pos.isAsset);

                    drawIcon(ctx, x, y, pos.type, color, isHovered ? 24 : 16);

                    // Label
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 9px Inter, sans-serif';
                    ctx.textAlign = 'center';

                    const label = pos.isAsset ? pos.name || mac.slice(-5).toUpperCase() : mac.slice(-5).toUpperCase();
                    ctx.fillText(label, x, y - (isHovered ? 24 : 18));

                    // Sub-label for type if it's an asset or hovered
                    if (pos.isAsset || isHovered) {
                        ctx.fillStyle = '#94a3b8';
                        ctx.font = '8px Inter, sans-serif';

                        let subLabel = pos.type || 'unknown';
                        if (!pos.isAsset && pos.manufacturer && pos.manufacturer !== 'Generic Device') {
                            const typeMap: Record<string, string> = {
                                'smartphone': 'Smartphone',
                                'laptop': 'Laptop',
                                'audio': 'Audio/Speaker',
                                'tv': 'Smart TV',
                                'tag': 'Tracking Tag',
                                'iot': 'IoT Device'
                            };
                            const typeName = typeMap[pos.typeGuess || ''] || '';
                            subLabel = typeName ? `${typeName} (${pos.manufacturer})` : pos.manufacturer;
                        }

                        ctx.fillText(subLabel, x, y + (isHovered ? 28 : 22));
                    }
                }
            });
        }

        // Draw Scanners
        scanners.forEach(s => {
            const x = s.x * room.scale;
            const y = s.y * room.scale;

            ctx.fillStyle = s.status === 'online' ? '#10b981' : '#cbd5e1';
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Scanner Ring
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.strokeStyle = `${s.status === 'online' ? '#10b981' : '#cbd5e1'}33`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.name, x, y + 32);
        });

    }, [room, scanners, devices, showHeatmap, historyPath, hoveredMac]);

    const handleMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
        let found: string | null = null;

        uniqueMacs.forEach(mac => {
            const pos = estimateDevicePosition(mac);
            if (pos) {
                const dx = x - (pos.x * room.scale);
                const dy = y - (pos.y * room.scale);
                if (Math.sqrt(dx * dx + dy * dy) < 20) found = mac;
            }
        });

        if (e.type === 'click' && found && onDeviceClick) {
            const dev = devices.find(d => d.macAddress === found);
            if (dev) onDeviceClick(found, dev.isAsset);
        } else if (e.type === 'mousemove') {
            setHoveredMac(found);
        }
    };

    return (
        <div className="w-full h-full overflow-auto bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-inner p-4 flex items-center justify-center">
            <canvas
                ref={canvasRef}
                width={room.width * room.scale}
                height={room.height * room.scale}
                onClick={handleMouse}
                onMouseMove={handleMouse}
                className="bg-white shadow-2xl rounded-2xl cursor-pointer"
            />
        </div>
    );
}
