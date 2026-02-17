BLE Multi-Node Asset Tracking & Room Monitoring System
0️⃣ PROJECT OVERVIEW
Objective

Membangun sistem:

Multi ESP32-C3 BLE Scanner

Asset Tracking (moving asset)

Room Occupancy Monitoring (4x4m)

Multi-site support

Realtime Web Dashboard

Heatmap Visualization

Privacy-safe

Periodic + Realtime reporting

1️⃣ WORKSPACE STRUCTURE

Buat monorepo dengan struktur:

ble-tracker/
│
├── apps/
│   ├── frontend/        (NextJS / React)
│   ├── backend/         (NodeJS + Express + Prisma)
│
├── firmware/
│   └── esp32-c3/        (Arduino or ESP-IDF)
│
├── packages/
│   └── shared-types/    (Type definitions shared FE/BE)
│
├── prisma/
│   └── schema.prisma
│
├── docker-compose.yml
├── .env
└── todolist.md


Gunakan:

npm workspace / pnpm workspace

2️⃣ SYSTEM ARCHITECTURE
Flow
BLE Device
   ↓
ESP32-C3 Scanner Node
   ↓ (WiFi HTTP POST / MQTT)
Backend API
   ↓
MySQL Database
   ↓
WebSocket
   ↓
Frontend Realtime Dashboard

3️⃣ DATABASE DESIGN (Prisma)
Entities
1. Site

id

name

description

2. Room

id

siteId

name

width

height

scale

backgroundImage

3. ScannerNode

id

nodeId (string unique)

name

roomId

x

y

lastSeen

status

4. Asset

id

macAddress (unique)

name

type

description

isBeacon

createdAt

5. DeviceLog

id

macAddress

scannerNodeId

rssi

timestamp

isAsset

hashedMac

6. AssetPresence

id

assetId

roomId

enteredAt

lastSeenAt

exitedAt

7. OccupancySnapshot

id

roomId

deviceCount

densityLevel

timestamp

4️⃣ BACKEND TODO (NodeJS + Express + Prisma)
4.1 Setup

Initialize Express

Setup Prisma + MySQL

Setup WebSocket (Socket.IO or WS)

Setup env config

4.2 API Endpoints
Scanner Ingestion

POST /api/scan

Payload:

{
  nodeId,
  mac,
  rssi,
  timestamp
}


Backend Logic:

Hash MAC (privacy-safe)

Store DeviceLog

Check if MAC matches Asset

Update AssetPresence

Broadcast via WebSocket

Node Management

GET /api/nodes

POST /api/nodes

PUT /api/nodes/:id

DELETE /api/nodes/:id

Asset Manager

GET /api/assets

POST /api/assets

PUT /api/assets/:id

DELETE /api/assets/:id

Room & Site

CRUD site

CRUD room

Upload room background

Logs

GET /api/logs

filter by:

room

mac

date range

asset only

4.3 Business Logic
Asset Presence Logic

If:

asset detected

not currently active
→ mark enteredAt

If:

not seen > timeout (90s)
→ mark exitedAt

Occupancy Logic

Every 30s:

Count unique hashedMac per room

Determine density:

0–3 = LOW

4–8 = MEDIUM

8 = HIGH

Store snapshot

Emit websocket update

5️⃣ FRONTEND TODO (NextJS Recommended)
5.1 Pages
Dashboard

Multi site selector

Room selector

Realtime stats

Active assets

Occupancy count

Node status

Realtime Map (GRID Based)

Features:

Background image

Grid scale

Scanner node position (x,y)

Asset approximate position (RSSI weighted average)

Heatmap

Implementation:

Use canvas layer

Color based on density

Update via websocket

Asset Manager Page

Add / Edit asset

Assign metadata

Beacon flag

Live status

Log Viewer

Table view

Filterable

Export CSV

6️⃣ ESP32-C3 FIRMWARE TODO
6.1 Device Identity

Each node must have:

nodeId

roomId

fixed X,Y coordinate

6.2 BLE Scan Logic

Continuous scan

Filter RSSI > threshold

Batch send every 5 seconds

6.3 Send Strategy

Batch Payload:

{
  nodeId: "NODE-01",
  roomId: "ROOM-01",
  scans: [
    { mac, rssi, ts }
  ]
}


Send via:

HTTP POST
or

MQTT (recommended for scaling)

6.4 Fail-safe

Auto reconnect WiFi

Queue unsent data

Heartbeat ping every 10s

7️⃣ MULTI NODE POSITION ESTIMATION

For 4x4 meter room:

Use:

RSSI smoothing (moving average)

Trilateration (if ≥3 nodes)

Approximation method:

Weighted centroid

8️⃣ PRIVACY-SAFE MODE

Before storing:

SHA256(mac + secretSalt)

Store hashedMac

Store raw MAC only for registered assets

9️⃣ REALTIME STRATEGY

Use WebSocket:

Emit:

node status

asset movement

occupancy update

heatmap data

Frontend subscribes per room.

🔟 PERFORMANCE TARGET

Per Node:

Scan window: 5s

Send batch: 5s

Max device per window: 50

Memory optimized

Backend:

Index macAddress

Index timestamp

Cleanup logs older than 30 days

1️⃣1️⃣ PHASED IMPLEMENTATION PLAN
Phase 1

Basic ESP scan

Backend ingestion

Log storage

Simple dashboard

Phase 2

Asset tracking logic

Presence detection

Occupancy snapshot

Phase 3

Multi-node support

Realtime WebSocket

Phase 4

Heatmap rendering

Position estimation

Phase 5

Privacy hash mode

Optimization

Docker deployment

1️⃣2️⃣ OPTIONAL FUTURE

BLE iBeacon support

MQTT broker cluster

Role-based access

Alert rule engine

Analytics chart

Historical replay

1️⃣3️⃣ AI AGENT EXECUTION RULES

AI Agent harus:

Kerjakan sesuai Phase

Jangan lompat fitur

Pastikan setiap phase:

tested

documented

Gunakan TypeScript untuk FE & BE

Gunakan environment variable untuk secret

Commit per phase

FINAL TARGET

Sistem siap untuk:

Kantor

Gudang

Kos

Masjid

Ruangan kelas

Event room

Scalable ke banyak site & node.