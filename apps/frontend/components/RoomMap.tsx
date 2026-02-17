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
    assetType?: string;
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

    // Color mapping for device types
    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'phone': return '#3b82f6'; // Blue
            case 'laptop': return '#8b5cf6'; // Purple
            case 'beacon': return '#6366f1'; // Indigo
            case 'badge': return '#ec4899'; // Pink
            case 'equipment': return '#f59e0b'; // Amber
            default: return '#9ca3af'; // Gray
        }
    };

    // Calculate device position based on RSSI from multiple scanners
    const estimateDevicePosition = (macAddress: string) => {
        const deviceLogs = devices.filter(d => d.macAddress === macAddress);

        if (deviceLogs.length === 0) return null;

        let totalX = 0;
        let totalY = 0;
        let totalWeight = 0;

        deviceLogs.forEach(log => {
            const scanner = scanners.find(s => s.id === log.scannerNodeId);
            if (scanner) {
                // Weighted average based on RSSI
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
            isAsset: deviceLogs[0].isAsset,
            type: deviceLogs[0].assetType
        };
    };

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

        // Draw Path
        if (historyPath.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
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

            historyPath.forEach((p, i) => {
                const x = p.x * room.scale;
                const y = p.y * room.scale;
                ctx.fillStyle = i === historyPath.length - 1 ? '#ef4444' : '#2563eb';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
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

                    drawIcon(ctx, x, y, pos.type, getTypeColor(pos.type), isHovered ? 32 : 24);

                    // Label
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 9px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(mac.slice(-5).toUpperCase(), x, y - (isHovered ? 24 : 18));
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
        let found = null;

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
