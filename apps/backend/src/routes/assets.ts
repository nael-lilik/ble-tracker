import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/assets - Get all assets
router.get('/', async (req, res) => {
    try {
        const assets = await prisma.asset.findMany({
            include: {
                assetPresences: {
                    where: { exitedAt: null },
                    include: {
                        room: {
                            include: {
                                site: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/assets/:id/history - Get asset movement history
router.get('/:id/history', async (req, res) => {
    try {
        const { limit } = req.query;
        const assetId = parseInt(req.params.id);

        const asset = await prisma.asset.findUnique({
            where: { id: assetId }
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Get movement history (asset presences)
        const presences = await prisma.assetPresence.findMany({
            where: { assetId },
            include: {
                room: {
                    include: { site: true }
                }
            },
            orderBy: { enteredAt: 'desc' },
            take: limit ? parseInt(limit as string) : 50
        });

        // Get detailed raw logs for path visualization (last 24h by default)
        const logs = await prisma.deviceLog.findMany({
            where: {
                macAddress: asset.macAddress,
                timestamp: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            include: {
                scannerNode: {
                    include: {
                        room: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: limit ? parseInt(limit as string) * 2 : 100
        });

        res.json({
            asset,
            presences,
            logs
        });
    } catch (error) {
        console.error('Error fetching asset history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/assets - Create new asset
router.post('/', async (req, res) => {
    try {
        const { macAddress, name, type, description, isBeacon } = req.body;

        if (!macAddress || !name) {
            return res.status(400).json({ error: 'Missing required fields: macAddress, name' });
        }

        const asset = await prisma.asset.create({
            data: {
                macAddress,
                name,
                type,
                description,
                isBeacon: isBeacon || false,
            },
        });

        // Update existing logs for this MAC address to mark them as asset logs
        await prisma.deviceLog.updateMany({
            where: { macAddress },
            data: { isAsset: true }
        });

        res.status(201).json(asset);
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', async (req, res) => {
    try {
        const { name, type, description, isBeacon } = req.body;

        const asset = await prisma.asset.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name && { name }),
                ...(type !== undefined && { type }),
                ...(description !== undefined && { description }),
                ...(isBeacon !== undefined && { isBeacon }),
            },
        });

        res.json(asset);
    } catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
    try {
        await prisma.asset.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
