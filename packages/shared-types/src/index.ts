// Shared types between frontend and backend

export interface Site {
    id: number;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Room {
    id: number;
    siteId: number;
    name: string;
    width: number;
    height: number;
    scale: number;
    backgroundImage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ScannerNode {
    id: number;
    nodeId: string;
    name: string;
    roomId: number;
    x: number;
    y: number;
    lastSeen?: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Asset {
    id: number;
    macAddress: string;
    name: string;
    type?: string;
    description?: string;
    isBeacon: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeviceLog {
    id: number;
    macAddress: string;
    scannerNodeId: number;
    rssi: number;
    timestamp: Date;
    isAsset: boolean;
    hashedMac: string;
}

export interface AssetPresence {
    id: number;
    assetId: number;
    roomId: number;
    enteredAt: Date;
    lastSeenAt: Date;
    exitedAt?: Date;
}

export interface OccupancySnapshot {
    id: number;
    roomId: number;
    deviceCount: number;
    densityLevel: string;
    timestamp: Date;
}

// API Request/Response types
export interface ScanPayload {
    nodeId: string;
    mac: string;
    rssi: number;
    timestamp?: string;
}

export interface ScanResponse {
    success: boolean;
    deviceLog: {
        id: number;
        isAsset: boolean;
        timestamp: Date;
    };
}

// WebSocket event types
export interface WSNodeStatusEvent {
    type: 'node_status';
    data: {
        nodeId: string;
        status: string;
        lastSeen: Date;
    };
}

export interface WSAssetMovementEvent {
    type: 'asset_movement';
    data: {
        assetId: number;
        roomId: number;
        position?: { x: number; y: number };
    };
}

export interface WSOccupancyUpdateEvent {
    type: 'occupancy_update';
    data: {
        roomId: number;
        deviceCount: number;
        densityLevel: string;
    };
}

export interface WSHeatmapDataEvent {
    type: 'heatmap_data';
    data: {
        roomId: number;
        heatmap: number[][];
    };
}

export type WSEvent =
    | WSNodeStatusEvent
    | WSAssetMovementEvent
    | WSOccupancyUpdateEvent
    | WSHeatmapDataEvent;
