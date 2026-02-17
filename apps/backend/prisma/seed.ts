import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding database for Simulation...');

    // 1. Create a site
    const site = await prisma.site.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Main Building',
            description: 'Primary building for BLE tracking',
        },
    });
    console.log('✅ Site created:', site.name);

    // 2. Create a room
    const room = await prisma.room.upsert({
        where: { id: 1 },
        update: {},
        create: {
            siteId: site.id,
            name: 'Main Hall',
            width: 15.0,
            height: 10.0,
            scale: 60.0,
        },
    });
    console.log('✅ Room created:', room.name);

    // 3. Create 3 Scanners
    const scanners = [
        { id: 'NODE-01', name: 'Scanner North', mac: '10:B4:1D:1D:90:DC', x: 7.5, y: 1.0 },
        { id: 'NODE-02', name: 'Scanner South-West', mac: '20:B4:1D:1D:90:DD', x: 2.0, y: 8.0 },
        { id: 'NODE-03', name: 'Scanner South-East', mac: '30:B4:1D:1D:90:DE', x: 13.0, y: 8.0 },
    ];

    for (const s of scanners) {
        await prisma.scannerNode.upsert({
            where: { macAddress: s.mac },
            update: { status: 'online', lastSeen: new Date() },
            create: {
                nodeId: s.id,
                macAddress: s.mac,
                name: s.name,
                roomId: room.id,
                x: s.x,
                y: s.y,
            },
        });
        console.log(`✅ Scanner created: ${s.name} (${s.mac})`);
    }

    // 4. Create 5 Assets
    const assets = [
        { name: 'Boss Laptop', mac: 'AA:AA:AA:AA:AA:01', type: 'laptop' },
        { name: 'Server Rack 01', mac: 'BB:BB:BB:BB:BB:02', type: 'server' },
        { name: 'Visitor Badge A', mac: 'CC:CC:CC:CC:CC:03', type: 'beacon', isBeacon: true },
        { name: 'Tool Box Alpha', mac: 'DD:DD:DD:DD:DD:04', type: 'equipment' },
        { name: 'Asset Tracker 05', mac: 'EE:EE:EE:EE:EE:05', type: 'beacon', isBeacon: true },
    ];

    for (const a of assets) {
        await prisma.asset.upsert({
            where: { macAddress: a.mac },
            update: {},
            create: {
                macAddress: a.mac,
                name: a.name,
                type: a.type,
                isBeacon: a.isBeacon || false,
            },
        });
        console.log(`✅ Asset created: ${a.name} (${a.mac})`);
    }

    console.log('\n🎉 Seeding completed! Database is ready for simulation.');
}

seed()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
