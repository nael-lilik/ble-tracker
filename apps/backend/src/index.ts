import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import scanRouter from './routes/scan';
import nodesRouter from './routes/nodes';
import assetsRouter from './routes/assets';
import sitesRouter from './routes/sites';
import roomsRouter from './routes/rooms';
import logsRouter from './routes/logs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://ble-tracker.nael.my.id',
        'https://ble-tracker-be.nael.my.id'
    ],
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/scan', scanRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export { prisma };
