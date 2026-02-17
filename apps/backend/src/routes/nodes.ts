import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/nodes - Get all scanner nodes
router.get('/', async (req, res) => {
    try {
        const { roomId } = req.query;

        const where: any = {};
        if (roomId) {
            where.roomId = parseInt(roomId as string);
        }

        const nodes = await prisma.scannerNode.findMany({
            where,
            include: {
                room: {
                    include: {
                        site: true,
                    },
                },
            },
        });
        res.json(nodes);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/nodes/:id - Get single node
router.get('/:id', async (req, res) => {
    try {
        const node = await prisma.scannerNode.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                room: {
                    include: {
                        site: true,
                    },
                },
            },
        });

        if (!node) {
            return res.status(404).json({ error: 'Node not found' });
        }

        res.json(node);
    } catch (error) {
        console.error('Error fetching node:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/nodes - Create new scanner node
router.post('/', async (req, res) => {
    try {
        const { nodeId, name, roomId, x, y } = req.body;

        if (!nodeId || !name || !roomId || x === undefined || y === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const node = await prisma.scannerNode.create({
            data: {
                nodeId,
                name,
                roomId,
                x,
                y,
                status: 'offline',
            },
        });

        res.status(201).json(node);
    } catch (error) {
        console.error('Error creating node:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/nodes/:id - Update scanner node
router.put('/:id', async (req, res) => {
    try {
        const { name, roomId, x, y, status } = req.body;

        const node = await prisma.scannerNode.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name && { name }),
                ...(roomId && { roomId }),
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y }),
                ...(status && { status }),
            },
        });

        res.json(node);
    } catch (error) {
        console.error('Error updating node:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/nodes/:id - Delete scanner node
router.delete('/:id', async (req, res) => {
    try {
        await prisma.scannerNode.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
