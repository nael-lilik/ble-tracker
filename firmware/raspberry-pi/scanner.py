import asyncio
import json
import time
import requests
import os
from bleak import BleakScanner
from dotenv import load_dotenv

# Load configuration
load_dotenv()

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:3001/api/scan")
SCAN_INTERVAL = int(os.getenv("SCAN_INTERVAL", 10))
BATCH_INTERVAL = int(os.getenv("BATCH_INTERVAL", 5))

# Global state
scanned_devices = []

async def scan_callback(device, advertisement_data):
    """Callback for found devices."""
    global scanned_devices
    
    # Simple filtering: focus on BLE devices with RSSI
    rssi = advertisement_data.rssi
    mac = device.address
    
    # Store result
    scanned_devices.append({
        "mac": mac,
        "rssi": rssi,
        "timestamp": int(time.time() * 1000)
    })

async def send_batch():
    """Periodically send accumulated results to backend."""
    global scanned_devices
    
    while True:
        await asyncio.sleep(BATCH_INTERVAL)
        
        if not scanned_devices:
            continue
            
        # Prepare batch
        batch_to_send = scanned_devices.copy()
        scanned_devices.clear()
        
        # Scanner info (this node)
        # On Linux, we could use something like getmac to get the actual interface MAC
        # For now, we'll use a placeholder or env variable
        scanner_mac = os.getenv("SCANNER_MAC", "B8:27:EB:00:00:01") # Default RPi 4 OUI
        
        # Wrap for backend ingestion
        payload = [
            {
                "scannerMac": scanner_mac,
                "mac": item["mac"],
                "rssi": item["rssi"],
                "timestamp": item["timestamp"]
            }
            for item in batch_to_send
        ]
        
        try:
            print(f"📡 Sending {len(payload)} detections to {API_URL}...")
            response = requests.post(API_URL, json=payload, timeout=5)
            if response.status_code == 200:
                print("✅ Successfully uploaded batch.")
            else:
                print(f"⚠️ Backend error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Connection failed: {e}")

async def run_scanner():
    """Main scanning loop."""
    print("🚀 Starting Raspberry Pi BLE Scanner...")
    print(f"🔗 Target API: {API_URL}")
    
    # Initialize scanner
    scanner = BleakScanner(detection_callback=scan_callback)
    
    # Run both scanning and sending tasks
    async with scanner:
        await send_batch()

if __name__ == "__main__":
    try:
        asyncio.run(run_scanner())
    except KeyboardInterrupt:
        print("\n🛑 Stopped by user.")
