#include <WiFi.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <map>

// ================= WIFI =================
const char* ssid = "wifi";
const char* password = "wifiwifi";

// ================= API CONFIG =================
const char* apiEndpoint = "https://ble-tracker-be.nael.my.id/api/scan";
String scannerMac = "";

// ================= SCAN CONFIG =================
int scanTime = 5;             // detik scan BLE
int reportInterval = 30000;   // kirim laporan tiap 30 detik
int rssiThreshold = -75;      // filter kekuatan sinyal

BLEScan* pBLEScan;
unsigned long lastReport = 0;

// simpan MAC unik dengan RSSI
std::map<String, int> detectedDevices;

void sendToBackend(String mac, int rssi) {
  HTTPClient http;
  
  // Build JSON payload
  String payload = "{\"scannerMac\":\"" + scannerMac + 
                   "\",\"mac\":\"" + mac + 
                   "\",\"rssi\":" + String(rssi) + 
                   ",\"timestamp\":" + String(millis()) + "}";
  
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    Serial.print("Sent: ");
    Serial.print(mac);
    Serial.print(" -> ");
    Serial.println(httpCode);
  }
  
  http.end();
}

class MyCallbacks: public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice device) {
    int rssi = device.getRSSI();
    if (rssi < rssiThreshold) return;

    String mac = device.getAddress().toString().c_str();
    
    // simpan hanya MAC unik dengan RSSI terbaru
    detectedDevices[mac] = rssi;
  }
};

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  
  // Get scanner MAC address
  scannerMac = WiFi.macAddress();
  Serial.print("Scanner MAC: ");
  Serial.println(scannerMac);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  connectWiFi();

  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyCallbacks());
  pBLEScan->setActiveScan(true);

  Serial.println("BLE Scanner Started");
}

void loop() {
  // ===== Scan BLE =====
  Serial.println("Scanning BLE...");
  pBLEScan->start(scanTime, false);
  pBLEScan->clearResults();

  // ===== Kirim ke backend tiap interval =====
  if (millis() - lastReport > reportInterval) {
    if (detectedDevices.size() > 0) {
      Serial.print("Sending ");
      Serial.print(detectedDevices.size());
      Serial.println(" devices to backend...");

      for (auto const& device : detectedDevices) {
        sendToBackend(device.first, device.second);
        delay(100); // Small delay between sends
      }

      detectedDevices.clear();
      Serial.println("Report sent!");
    } else {
      Serial.println("No devices detected");
    }

    lastReport = millis();
  }
  
  delay(100);
}
