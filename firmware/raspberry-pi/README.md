# Raspberry Pi 4 BLE Scanner

This script transforms your Raspberry Pi 4 into a BLE Scanner node for the Asset Tracking System.

## Prerequisites

1. **Hardware**: Raspberry Pi 4 (or 3B+) with built-in Bluetooth.
2. **OS**: Raspberry Pi OS (recommended).
3. **Python**: Version 3.8 or higher.

## Setup Instructions

1. **Install Bluetooth dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y bluez libbluetooth-dev python3-dev
   ```

2. **Clone/Copy this directory** to your Raspberry Pi.

3. **Install Python libraries**:
   ```bash
   pip3 install -r requirements.txt
   ```

4. **Configure Environment**:
   Create a `.env` file in this directory:
   ```env
   API_URL=http://<YOUR_BACKEND_IP>:3001/api/scan
   SCANNER_MAC=B8:27:EB:XX:XX:XX  # Use your RPi actual MAC or a unique ID
   BATCH_INTERVAL=5
   ```

5. **Run the Scanner**:
   ```bash
   sudo python3 scanner.py
   ```
   *Note: `sudo` might be required for Bluetooth access on some Linux distributions.*

## How it works

- Uses the `bleak` library for asynchronous BLE discovery.
- Collects all detected BLE advertisements.
- Every 5 seconds (configurable), it sends a batch of results to the central Backend API.
- Automatically handles reconnection and basic error reporting.
