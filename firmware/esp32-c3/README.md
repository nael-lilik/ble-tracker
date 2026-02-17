# ESP32-C3 BLE Scanner Firmware

## Hardware Requirements
- ESP32-C3 DevKit
- USB-C cable for programming
- WiFi network access

## Dependencies
Install the following libraries via Arduino IDE Library Manager:
- ArduinoJson (v6.x)

## Configuration
Edit the following constants in `ble-scanner.ino`:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_ENDPOINT = "http://YOUR_BACKEND_IP:3001/api/scan";
const char* NODE_ID = "NODE-01";  // Unique node identifier
const char* ROOM_ID = "ROOM-01";  // Room this node is in
const float NODE_X = 0.0;  // X position in room (meters)
const float NODE_Y = 0.0;  // Y position in room (meters)
```

## Upload Instructions
1. Open `ble-scanner.ino` in Arduino IDE
2. Select board: **ESP32C3 Dev Module**
3. Configure settings:
   - Upload Speed: 921600
   - USB CDC On Boot: Enabled
   - Flash Size: 4MB
4. Select the correct COM port
5. Click Upload

## Operation
- On boot, the device connects to WiFi
- Continuously scans for BLE devices every 5 seconds
- Filters devices by RSSI threshold (-80 dBm)
- Sends scan results to backend API
- Sends heartbeat every 10 seconds

## Serial Monitor
Baud rate: 115200

Expected output:
```
=== BLE Scanner Node Starting ===
Node ID: NODE-01
Room ID: ROOM-01
Connecting to WiFi: YourSSID
WiFi connected!
IP address: 192.168.1.100
Initializing BLE...
=== Setup Complete ===

Scanning BLE devices...
Detected: aa:bb:cc:dd:ee:ff, RSSI: -65
Scan complete. Found 3 devices
Sending batch of 3 scans...
HTTP Response: 200
Batch sent successfully
```

## Troubleshooting
- **WiFi connection failed**: Check SSID and password
- **HTTP Error**: Verify backend IP and port, ensure backend is running
- **No devices detected**: Check RSSI threshold, ensure BLE devices are nearby
