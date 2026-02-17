# 🚀 Quick Start Guide

## Prerequisites Check

✅ Node.js 18+ installed
✅ MySQL running (via Docker or local)
✅ Port 3001 tunneled via cloudflared to `ble-tracker-be.nael.my.id`
✅ Port 3000 tunneled via cloudflared to `ble-tracker.nael.my.id`

## Setup Steps

### Option 1: Automated Setup (Recommended)

Run the setup script:

```cmd
setup.bat
```

This will:
1. Install all dependencies (backend, frontend, shared-types)
2. Generate Prisma client
3. Push database schema to MySQL

### Option 2: Manual Setup

#### 1. Start MySQL Database

```cmd
docker-compose up -d
```

#### 2. Install Backend Dependencies

```cmd
cd apps\backend
npm install
npx prisma generate
npx prisma db push
cd ..\..
```

#### 3. Install Frontend Dependencies

```cmd
cd apps\frontend
npm install
cd ..\..
```

#### 4. Install Shared Types

```cmd
cd packages\shared-types
npm install
cd ..\..
```

## Running the Application

### Start Backend (Terminal 1)

```cmd
start-backend.bat
```

Or manually:
```cmd
cd apps\backend
npm run dev
```

Backend will run on `http://localhost:3001` (tunneled to `https://ble-tracker-be.nael.my.id`)

### Start Frontend (Terminal 2)

```cmd
start-frontend.bat
```

Or manually:
```cmd
cd apps\frontend
npm run dev
```

Frontend will run on `http://localhost:3000` (tunneled to `https://ble-tracker.nael.my.id`)

## Initial Data Setup

### 1. Create a Site

```cmd
curl -X POST https://ble-tracker-be.nael.my.id/api/sites ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Main Office\", \"description\": \"Headquarters\"}"
```

### 2. Create a Room

```cmd
curl -X POST https://ble-tracker-be.nael.my.id/api/rooms ^
  -H "Content-Type: application/json" ^
  -d "{\"siteId\": 1, \"name\": \"Conference Room A\", \"width\": 4, \"height\": 4}"
```

### 3. Register a Scanner Node

```cmd
curl -X POST https://ble-tracker-be.nael.my.id/api/nodes ^
  -H "Content-Type: application/json" ^
  -d "{\"nodeId\": \"NODE-01\", \"name\": \"Main Scanner\", \"roomId\": 1, \"x\": 2.0, \"y\": 2.0}"
```

### 4. Register an Asset

```cmd
curl -X POST https://ble-tracker-be.nael.my.id/api/assets ^
  -H "Content-Type: application/json" ^
  -d "{\"macAddress\": \"AA:BB:CC:DD:EE:FF\", \"name\": \"Test Beacon\", \"type\": \"beacon\", \"isBeacon\": true}"
```

### 5. Test Scanner Ingestion

```cmd
curl -X POST https://ble-tracker-be.nael.my.id/api/scan ^
  -H "Content-Type: application/json" ^
  -d "{\"nodeId\": \"NODE-01\", \"mac\": \"AA:BB:CC:DD:EE:FF\", \"rssi\": -65}"
```

## Verify Everything Works

1. **Backend Health Check**:
   ```cmd
   curl https://ble-tracker-be.nael.my.id/health
   ```

2. **Open Frontend**: 
   - Local: `http://localhost:3000`
   - Public: `https://ble-tracker.nael.my.id`

3. **Check Database**: 
   ```cmd
   cd apps\backend
   npx prisma studio
   ```

## Troubleshooting

### MySQL Connection Error

Make sure MySQL is running:
```cmd
docker-compose up -d
docker-compose ps
```

### Port Already in Use

Kill the process using the port:
```cmd
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Prisma Client Not Generated

```cmd
cd apps\backend
npx prisma generate
```

### Dependencies Not Installing

Try clearing npm cache:
```cmd
npm cache clean --force
npm install
```

## ESP32 Configuration

Update the firmware configuration in `firmware/esp32-c3/ble-scanner/ble-scanner.ino`:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_ENDPOINT = "https://ble-tracker-be.nael.my.id/api/scan";
const char* NODE_ID = "NODE-01";  // Must match registered node
```

Upload to ESP32-C3 using Arduino IDE.

## Next Steps

Once everything is running:

1. ✅ Backend running on port 3001 (tunneled to `https://ble-tracker-be.nael.my.id`)
2. ✅ Frontend running on port 3000 (tunneled to `https://ble-tracker.nael.my.id`)
3. ✅ Database schema created
4. ✅ Initial data loaded

You're ready to:
- Configure ESP32 nodes
- Start tracking assets
- Monitor room occupancy
- View real-time dashboard
