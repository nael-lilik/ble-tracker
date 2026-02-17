import { Router } from 'express';
import { prisma } from '../index';
import crypto from 'crypto';

const router = Router();

// POST /api/scan - Scanner ingestion endpoint
// POST /api/scan - Scanner ingestion endpoint (supports batching)
router.post('/', async (req, res) => {
    const requestTime = new Date().toISOString();

    try {
        const body = req.body;
        const scans = Array.isArray(body) ? body : [body];

        console.log(`[${requestTime}] 📡 Received scan data:`, {
            count: scans.length,
            isArray: Array.isArray(body),
            firstScan: scans[0]
        });

        if (scans.length === 0) {
            console.log(`[${requestTime}] ❌ Empty scan data received`);
            return res.status(400).json({ error: 'Empty scan data' });
        }

        const results = [];

        for (const scanData of scans) {
            const { scannerMac, mac, rssi, timestamp } = scanData;

            // Validate input
            if (!scannerMac || !mac || rssi === undefined) {
                console.log(`[${requestTime}] ⚠️  Invalid scan data:`, { scannerMac, mac, rssi });
                results.push({ mac, success: false, error: 'Missing required fields' });
                continue;
            }

            // Find scanner node by MAC address
            const scannerNode = await prisma.scannerNode.findUnique({
                where: { macAddress: scannerMac },
            });

            if (!scannerNode) {
                console.log(`[${requestTime}] ⚠️  Scanner not found: ${scannerMac}`);
                results.push({ mac, success: false, error: `Scanner node with MAC ${scannerMac} not found` });
                continue;
            }

            console.log(`[${requestTime}] ✅ Scanner found: ${scannerNode.name} (${scannerMac})`);

            // Update scanner node last seen
            await prisma.scannerNode.update({
                where: { id: scannerNode.id },
                data: { lastSeen: new Date(), status: 'online' },
            });

            // Hash MAC for privacy
            const secretSalt = process.env.SECRET_SALT || 'default-salt';
            const hashedMac = crypto
                .createHash('sha256')
                .update(mac + secretSalt)
                .digest('hex');

            // Check if MAC is a registered asset
            const asset = await prisma.asset.findUnique({
                where: { macAddress: mac },
            });

            const isAsset = !!asset;

            if (asset) {
                console.log(`[${requestTime}] 🎯 Detected registered asset: ${asset.name} (${mac})`);
            } else {
                console.log(`[${requestTime}] 📱 Unknown device: ${mac} | RSSI: ${rssi}`);
            }

            // Store device log
            const deviceLog = await prisma.deviceLog.create({
                data: {
                    macAddress: mac,
                    scannerNodeId: scannerNode.id,
                    rssi,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    isAsset,
                    hashedMac,
                },
            });

            // If it's a registered asset, update presence
            if (asset) {
                const now = new Date();

                // Check if there's an active presence (not exited)
                const activePresence = await prisma.assetPresence.findFirst({
                    where: {
                        assetId: asset.id,
                        roomId: scannerNode.roomId,
                        exitedAt: null,
                    },
                });

                if (activePresence) {
                    await prisma.assetPresence.update({
                        where: { id: activePresence.id },
                        data: { lastSeenAt: now },
                    });
                    console.log(`[${requestTime}] 🔄 Updated presence for ${asset.name}`);
                } else {
                    await prisma.assetPresence.create({
                        data: {
                            assetId: asset.id,
                            roomId: scannerNode.roomId,
                            enteredAt: now,
                            lastSeenAt: now,
                        },
                    });
                    console.log(`[${requestTime}] 🆕 New presence created for ${asset.name} in room`);
                }
            }

            results.push({ mac, success: true, logId: deviceLog.id });
        }

        console.log(`[${requestTime}] ✅ Processed ${results.length} scans successfully`);

        res.json({
            success: true,
            processedCount: results.length,
            results,
        });
    } catch (error) {
        console.error(`[${requestTime}] ❌ Error processing scan:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
