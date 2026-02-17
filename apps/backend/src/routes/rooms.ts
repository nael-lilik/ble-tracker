import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/rooms - Get all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            include: {
                site: true,
                scannerNodes: true,
            },
        });
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/rooms/:id - Get single room
router.get('/:id', async (req, res) => {
    try {
        const room = await prisma.room.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                site: true,
                scannerNodes: true,
                assetPresences: {
                    where: { exitedAt: null },
                    include: {
                        asset: true,
                    },
                },
            },
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json(room);
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/rooms - Create new room
router.post('/', async (req, res) => {
    try {
        const { siteId, name, width, height, scale, backgroundImage } = req.body;

        if (!siteId || !name || !width || !height) {
            return res.status(400).json({ error: 'Missing required fields: siteId, name, width, height' });
        }

        const room = await prisma.room.create({
            data: {
                siteId,
                name,
                width,
                height,
                scale: scale || 1.0,
                backgroundImage,
            },
        });

        res.status(201).json(room);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/rooms/:id - Update room
router.put('/:id', async (req, res) => {
    try {
        const { name, width, height, scale, backgroundImage } = req.body;

        const room = await prisma.room.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name && { name }),
                ...(width !== undefined && { width }),
                ...(height !== undefined && { height }),
                ...(scale !== undefined && { scale }),
                ...(backgroundImage !== undefined && { backgroundImage }),
            },
        });

        res.json(room);
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/rooms/:id - Delete room
router.delete('/:id', async (req, res) => {
    try {
        await prisma.room.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
