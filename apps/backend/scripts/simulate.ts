import axios from 'axios';

const API_URL = 'http://localhost:3001/api/scan';

// 3 Scanners (matching seed data)
const SCANNERS = [
    { name: 'Scanner North', mac: '10:B4:1D:1D:90:DC', x: 7.5, y: 1.0 },
    { name: 'Scanner South-West', mac: '20:B4:1D:1D:90:DD', x: 2.0, y: 8.0 },
    { name: 'Scanner South-East', mac: '30:B4:1D:1D:90:DE', x: 13.0, y: 8.0 },
];

// 5 Registered Assets
const ASSETS = [
    { name: 'Boss Laptop', mac: 'AA:AA:AA:AA:AA:01' },
    { name: 'Server Rack 01', mac: 'BB:BB:BB:BB:BB:02' },
    { name: 'Visitor Badge A', mac: 'CC:CC:CC:CC:CC:03' },
    { name: 'Tool Box Alpha', mac: 'DD:DD:DD:DD:DD:04' },
    { name: 'Asset Tracker 05', mac: 'EE:EE:EE:EE:EE:05' },
];

// Add Random "Noise" devices (Phones, Laptops moving around)
const RANDOM_DEVICES = [
    { name: 'Unregistered iPhone', mac: 'AC:37:43:11:22:33' }, // Apple
    { name: 'Samsung Galaxy S24', mac: '50:85:69:AA:BB:CC' }, // Samsung
    { name: 'Bose Headphones', mac: '00:0C:8A:99:88:77' },    // Bose Audio
    { name: 'Visitor Laptop', mac: '08:3E:8E:44:55:66' },    // Lenovo Laptop
    { name: 'Random Phone', mac: '12:B4:1D:1D:90:90' },     // Randomized MAC
];

// Configuration
const INTERVAL_MS = 2000; // Increased frequency for smoother trails (2s)
const ROOM_WIDTH = 15;
const ROOM_HEIGHT = 10;

// Internal state: track simulated positions
const allDevices = [...ASSETS, ...RANDOM_DEVICES].map(d => ({
    ...d,
    x: Math.random() * ROOM_WIDTH,
    y: Math.random() * ROOM_HEIGHT,
    vx: (Math.random() - 0.5) * 0.8, // Slightly faster movement for visible trails
    vy: (Math.random() - 0.5) * 0.8,
}));

/**
 * Calculate RSSI based on distance (Path Loss Model)
 * RSSI = -55 - 25 * log10(distance) + noise
 */
function calculateRSSI(dist: number): number {
    if (dist < 0.1) dist = 0.1;
    const baseRSSI = -55 - 25 * Math.log10(dist);
    const noise = (Math.random() - 0.5) * 4;
    return Math.round(baseRSSI + noise);
}

async function runSimulation() {
    console.log('🚀 Starting ADVANCED BLE Scanner Simulation...');
    console.log(`📡 Targeting API: ${API_URL}`);
    console.log(`⏱️ Interval: ${INTERVAL_MS}ms`);
    console.log(`📦 Devices: ${allDevices.length} (5 Assets + 5 Randoms)\n`);

    setInterval(async () => {
        // 1. Update positions
        allDevices.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off walls
            if (p.x < 0 || p.x > ROOM_WIDTH) p.vx *= -1;
            if (p.y < 0 || p.y > ROOM_HEIGHT) p.vy *= -1;

            // Randomly change direction slightly
            if (Math.random() > 0.8) {
                p.vx += (Math.random() - 0.5) * 0.2;
                p.vy += (Math.random() - 0.5) * 0.2;
                // Limit speed
                p.vx = Math.max(-1, Math.min(1, p.vx));
                p.vy = Math.max(-1, Math.min(1, p.vy));
            }
        });

        // 2. For each scanner, send batch
        for (const scanner of SCANNERS) {
            const batch: any[] = [];

            allDevices.forEach(device => {
                const dist = Math.sqrt(
                    Math.pow(device.x - scanner.x, 2) +
                    Math.pow(device.y - scanner.y, 2)
                );

                // Simulation scanner range (15m)
                if (dist < 15) {
                    batch.push({
                        scannerMac: scanner.mac,
                        mac: device.mac,
                        rssi: calculateRSSI(dist),
                        timestamp: new Date().getTime()
                    });
                }
            });

            if (batch.length > 0) {
                try {
                    await axios.post(API_URL, batch);
                } catch (error: any) {
                    console.error(`❌ [${scanner.name}] Error: ${error.message}`);
                }
            }
        }
        process.stdout.write('.'); // Progress indicator

    }, INTERVAL_MS);
}

runSimulation().catch(console.error);
