'use client';

import { useEffect, useState } from 'react';

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
}

interface RoomMapProps {
    room: Room;
    scanners: ScannerNode[];
    devices: DeviceDetection[];
    showHeatmap?: boolean;
    historyPath?: { x: number; y: number; timestamp: string }[];
}

export default function RoomMap({ room, scanners, devices, showHeatmap = false, historyPath = [] }: RoomMapProps) {
    const canvasRef = useState<HTMLCanvasElement | null>(null);
    const [canvas, setCanvas] = canvasRef;

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

        // Draw Heatmap
        if (showHeatmap) {
            const tileSize = 40;
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
                        ctx.fillStyle = `rgba(249, 115, 22, ${intensity * 0.6})`;
                        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                    }
                }
            }
        }

        // Draw History Path
        if (historyPath.length > 1) {
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;

            historyPath.forEach((point, index) => {
                const x = point.x * room.scale;
                const y = point.y * room.scale;
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw points on path
            historyPath.forEach((point, index) => {
                const x = point.x * room.scale;
                const y = point.y * room.scale;
                ctx.fillStyle = index === historyPath.length - 1 ? '#ef4444' : '#3b82f6';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        // Draw detected devices (if not historical view)
        if (historyPath.length === 0) {
            const uniqueMacs = [...new Set(devices.map(d => d.macAddress))];
            uniqueMacs.forEach(mac => {
                const position = estimateDevicePosition(mac);
                if (position) {
                    const x = position.x * room.scale;
                    const y = position.y * room.scale;

                    ctx.fillStyle = position.isAsset ? '#3b82f6' : '#9ca3af';
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;

                    ctx.fillStyle = '#1f2937';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(mac.slice(-5), x, y - 12);
                }
            });
        }

        // Draw scanner nodes
        scanners.forEach((scanner) => {
            const x = scanner.x * room.scale;
            const y = scanner.y * room.scale;

            ctx.fillStyle = scanner.status === 'online' ? '#10b981' : '#6b7280';
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#1f2937';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scanner.name, x, y + 25);
        });

    }, [canvas, room, scanners, devices, showHeatmap, historyPath]);

    const canvasWidth = room.width * room.scale;
    const canvasHeight = room.height * room.scale;

    return (
        <div className="flex flex-col items-center">
            <canvas
                ref={setCanvas}
                width={canvasWidth}
                height={canvasHeight}
                className="border border-gray-200 rounded-lg shadow-inner bg-white cursor-crosshair"
            />
        </div>
    );
}
