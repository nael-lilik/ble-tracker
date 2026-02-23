import { Router } from 'express';
import { prisma } from '../index';
import { getVendorInfo } from '../utils/oui';

const router = Router();

// GET /api/logs - Get device logs with filters
router.get('/', async (req, res) => {
    try {
        const { roomId, macAddress, startDate, endDate, assetOnly, limit } = req.query;

        const where: any = {};

        // Filter by room (via scanner node)
        if (roomId) {
            const nodes = await prisma.scannerNode.findMany({
                where: { roomId: parseInt(roomId as string) },
                select: { id: true },
            });
            where.scannerNodeId = { in: nodes.map(n => n.id) };
        }

        // Filter by MAC address
        if (macAddress) {
            where.macAddress = macAddress as string;
        }

        // Filter by date range
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                where.timestamp.gte = new Date(startDate as string);
            }
            if (endDate) {
                where.timestamp.lte = new Date(endDate as string);
            }
        }

        // Filter asset only
        if (assetOnly === 'true') {
            where.isAsset = true;
        }

        const maxLimit = limit ? Math.min(parseInt(limit as string), 1000) : 1000;

        const logs = await prisma.deviceLog.findMany({
            where,
            include: {
                scannerNode: {
                    include: {
                        room: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: maxLimit,
        });

        // Fetch asset info for logs that are assets
        const assetMacs = [...new Set(logs.filter(l => l.isAsset).map(l => l.macAddress))];
        const assets = await prisma.asset.findMany({
            where: { macAddress: { in: assetMacs } }
        });

        const assetMap = new Map(assets.map(a => [a.macAddress, a]));

        const logsWithInfo = logs.map(log => {
            const vendor = getVendorInfo(log.macAddress);
            return {
                ...log,
                assetName: assetMap.get(log.macAddress)?.name,
                assetType: assetMap.get(log.macAddress)?.type,
                manufacturer: vendor.name,
                typeGuess: vendor.type
            };
        });

        res.json(logsWithInfo);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/logs/discovered - Get unique unregistered devices seen recently
router.get('/discovered', async (req, res) => {
    try {
        const { hours = '1', limit = '50' } = req.query;
        const timeLimit = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);

        // Raw query to get unique MACs with most recent data
        // because Prisma groupBy doesn't allow including other fields easily
        const discovered = await prisma.$queryRaw`
            SELECT 
                l.macAddress, 
                MAX(l.timestamp) as lastSeen, 
                MAX(l.rssi) as maxRssi,
                n.name as scannerName,
                r.name as roomName
            FROM device_logs l
            JOIN scanner_nodes n ON l.scannerNodeId = n.id
            JOIN rooms r ON n.roomId = r.id
            WHERE l.isAsset = 0 AND l.timestamp >= ${timeLimit}
            GROUP BY l.macAddress
            ORDER BY lastSeen DESC
            LIMIT ${parseInt(limit as string)}
        `;

        res.json(discovered);
    } catch (error) {
        console.error('Error fetching discovered devices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
