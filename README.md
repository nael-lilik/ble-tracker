# BLE Multi-Node Asset Tracking System

A comprehensive IoT system for tracking BLE assets and monitoring room occupancy using multiple ESP32-C3 scanner nodes, with a real-time web dashboard.

## 🎯 Features

- **Multi-Node BLE Scanning**: Deploy multiple ESP32-C3 nodes across different rooms
- **Asset Tracking**: Track registered BLE devices (phones, beacons, etc.)
- **Room Occupancy Monitoring**: Real-time occupancy detection and density levels
- **Privacy-Safe**: MAC address hashing for non-registered devices
- **Real-time Dashboard**: Live updates via WebSocket
- **Multi-Site Support**: Manage multiple sites and rooms
- **Heatmap Visualization**: Visual representation of device density

## 📁 Project Structure

```
ble-tracker/
├── apps/
│   ├── backend/         # Node.js + Express + Prisma API
│   └── frontend/        # Next.js dashboard
├── firmware/
│   └── esp32-c3/        # ESP32-C3 Arduino firmware
├── packages/
│   └── shared-types/    # Shared TypeScript types
├── docker-compose.yml   # MySQL database
└── .env                 # Environment variables
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Arduino IDE (for ESP32 firmware)
- MySQL (via Docker or local installation)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 2. Start Database

```bash
# Start MySQL container
docker-compose up -d
```

### 3. Setup Backend

```bash
# Generate Prisma client
npm run prisma:generate

# Push database schema
npm run prisma:push

# Start backend server
npm run dev:backend
```

Backend will run on `http://localhost:3001` (tunneled to `https://ble-tracker-be.nael.my.id`)

### 4. Start Frontend

```bash
# In a new terminal
npm run dev:frontend
```

Frontend will run on `http://localhost:3000` (tunneled to `https://ble-tracker.nael.my.id`)

### 5. Configure ESP32 Nodes

See [firmware/esp32-c3/README.md](firmware/esp32-c3/README.md) for detailed instructions.

## 📊 Database Schema

- **Site**: Multi-site support
- **Room**: Rooms within sites (4x4m default)
- **ScannerNode**: ESP32 scanner nodes with position
- **Asset**: Registered BLE devices
- **DeviceLog**: All BLE scan records
- **AssetPresence**: Asset entry/exit tracking
- **OccupancySnapshot**: Periodic occupancy data

## 🔌 API Endpoints

### Scanner Ingestion
- `POST /api/scan` - Receive BLE scan data from nodes

### Management
- `GET/POST/PUT/DELETE /api/sites` - Site management
- `GET/POST/PUT/DELETE /api/rooms` - Room management
- `GET/POST/PUT/DELETE /api/nodes` - Scanner node management
- `GET/POST/PUT/DELETE /api/assets` - Asset management

### Data
- `GET /api/logs` - Query device logs (with filters)

## 🔐 Environment Variables

Copy `.env` and configure:

```env
DATABASE_URL="mysql://bleuser:blepassword@localhost:3306/ble_tracker"
PORT=3001
SECRET_SALT="your-random-salt-for-hashing"
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 Development Phases

### ✅ Phase 1: Basic Setup (Current)
- [x] Monorepo structure
- [x] Backend API with Prisma
- [x] Database schema
- [x] Scanner ingestion endpoint
- [x] Basic frontend scaffold
- [x] ESP32 firmware

### 🔄 Phase 2: Asset Tracking Logic
- [ ] Asset presence detection
- [ ] Occupancy snapshot job
- [ ] Exit detection (timeout-based)

### 🔄 Phase 3: Real-time & Multi-node
- [ ] WebSocket implementation
- [ ] Real-time dashboard updates
- [ ] Multi-node position estimation

### 🔄 Phase 4: Visualization
- [ ] Heatmap rendering
- [ ] Position estimation (trilateration)
- [ ] Interactive room map

### 🔄 Phase 5: Privacy & Deployment
- [ ] Enhanced privacy mode
- [ ] Performance optimization
- [ ] Docker deployment

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Prisma, Socket.IO
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database**: MySQL 8.0
- **Firmware**: Arduino (ESP32-C3)
- **DevOps**: Docker, Docker Compose

## 📖 Usage Examples

### Register a Scanner Node

```bash
curl -X POST http://localhost:3001/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "NODE-01",
    "name": "Main Entrance",
    "roomId": 1,
    "x": 0.5,
    "y": 0.5
  }'
```

### Register an Asset

```bash
curl -X POST http://localhost:3001/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "name": "Employee Badge #123",
    "type": "beacon",
    "isBeacon": true
  }'
```

## 🎯 Use Cases

- Office occupancy monitoring
- Warehouse asset tracking
- Dormitory/hostel management
- Mosque/prayer room monitoring
- Classroom attendance
- Event space management

## 📄 License

MIT

## 🤝 Contributing

This is a personal project. Feel free to fork and adapt for your needs.
