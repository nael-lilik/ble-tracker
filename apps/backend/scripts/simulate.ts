import axios from 'axios';

const API_URL = 'http://localhost:3001/api/scan';

// 3 Scanners (matching seed data)
const SCANNERS = [
    { name: 'Scanner North', mac: '40:B4:1D:1D:90:DC', x: 7.5, y: 1.0 },
    { name: 'Scanner South-West', mac: '20:B4:1D:1D:90:DD', x: 2.0, y: 8.0 },
    { name: 'Scanner South-East', mac: '30:B4:1D:1D:90:DE', x: 13.0, y: 8.0 },
];

// 5 Assets (matching seed data)
const ASSETS = [
    { name: 'Boss Laptop', mac: 'AA:AA:AA:AA:AA:01' },
    { name: 'Server Rack 01', mac: 'BB:BB:BB:BB:BB:02' },
    { name: 'Visitor Badge A', mac: 'CC:CC:CC:CC:CC:03' },
    { name: 'Tool Box Alpha', mac: 'DD:DD:DD:DD:DD:04' },
    { name: 'Asset Tracker 05', mac: 'EE:EE:EE:EE:EE:05' },
];

// Configuration
const INTERVAL_MS = 3000; // Send every 3 seconds
const ROOM_WIDTH = 15;
const ROOM_HEIGHT = 10;

// Internal state: track simulated positions
const assetPositions = ASSETS.map(a => ({
    ...a,
    x: Math.random() * ROOM_WIDTH,
    y: Math.random() * ROOM_HEIGHT,
    vx: (Math.random() - 0.5) * 0.5, // velocity x
    vy: (Math.random() - 0.5) * 0.5, // velocity y
}));

/**
 * Calculate RSSI based on distance (simplified model)
 * RSSI = -30 - 20 * log10(distance) + noise
 */
function calculateRSSI(dist: number): number {
    if (dist < 0.1) dist = 0.1;
    const baseRSSI = -40 - 20 * Math.log10(dist);
    const noise = (Math.random() - 0.5) * 5;
    return Math.round(baseRSSI + noise);
}

async function runSimulation() {
    console.log('🚀 Starting BLE Scanner Simulation...');
    console.log(`📡 Targeting API: ${API_URL}`);
    console.log(`⏱️ Interval: ${INTERVAL_MS}ms\n`);

    setInterval(async () => {
        // 1. Update positions (simulate gentle movement)
        assetPositions.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off walls
            if (p.x < 0 || p.x > ROOM_WIDTH) p.vx *= -1;
            if (p.y < 0 || p.y > ROOM_HEIGHT) p.vy *= -1;
        });

        // 2. For each scanner, find nearby devices and send batch
        for (const scanner of SCANNERS) {
            const batch: any[] = [];

            assetPositions.forEach(asset => {
                const dist = Math.sqrt(
                    Math.pow(asset.x - scanner.x, 2) +
                    Math.pow(asset.y - scanner.y, 2)
                );

                // Simulate scanner range (e.g., 10 meters)
                if (dist < 12) {
                    batch.push({
                        scannerMac: scanner.mac,
                        mac: asset.mac,
                        rssi: calculateRSSI(dist),
                        timestamp: new Date().getTime()
                    });
                }
            });

            if (batch.length > 0) {
                try {
                    await axios.post(API_URL, batch);
                    console.log(`✅ [${scanner.name}] Sent ${batch.length} detections`);
                } catch (error: any) {
                    console.error(`❌ [${scanner.name}] Error: ${error.message}`);
                }
            }
        }
        console.log('--- Batch Complete ---\n');

    }, INTERVAL_MS);
}

runSimulation().catch(console.error);
