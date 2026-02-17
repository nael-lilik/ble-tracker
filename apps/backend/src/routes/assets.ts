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

// GET /api/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
    try {
        const asset = await prisma.asset.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                assetPresences: {
                    include: {
                        room: true,
                    },
                    orderBy: {
                        enteredAt: 'desc',
                    },
                },
            },
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json(asset);
    } catch (error) {
        console.error('Error fetching asset:', error);
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
