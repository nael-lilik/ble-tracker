import { Router } from 'express';
import { prisma } from '../index';

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

        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
