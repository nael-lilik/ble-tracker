import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/sites - Get all sites
router.get('/', async (req, res) => {
    try {
        const sites = await prisma.site.findMany({
            include: {
                rooms: true,
            },
        });
        res.json(sites);
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/sites/:id - Get single site
router.get('/:id', async (req, res) => {
    try {
        const site = await prisma.site.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                rooms: {
                    include: {
                        scannerNodes: true,
                    },
                },
            },
        });

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        res.json(site);
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/sites - Create new site
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Missing required field: name' });
        }

        const site = await prisma.site.create({
            data: {
                name,
                description,
            },
        });

        res.status(201).json(site);
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/sites/:id - Update site
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;

        const site = await prisma.site.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
            },
        });

        res.json(site);
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/sites/:id - Delete site
router.delete('/:id', async (req, res) => {
    try {
        await prisma.site.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
