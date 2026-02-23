/**
 * OUI (Organizationally Unique Identifier) Lookup Utility
 * Maps the first 3 bytes of a MAC address to the manufacturer name and likely device type.
 */

type DeviceType = 'smartphone' | 'laptop' | 'audio' | 'tv' | 'tag' | 'iot' | 'computer' | 'network' | 'generic';

interface VendorInfo {
    name: string;
    type: DeviceType;
}

const OUI_MAP: Record<string, VendorInfo> = {
    // --- Smartphones ---
    'AC:37:43': { name: 'Apple', type: 'smartphone' },
    'B8:09:8A': { name: 'Apple', type: 'smartphone' },
    '34:A3:95': { name: 'Apple', type: 'smartphone' },
    '44:D8:84': { name: 'Apple', type: 'smartphone' },
    'E4:E4:AB': { name: 'Apple', type: 'smartphone' },
    '50:85:69': { name: 'Samsung', type: 'smartphone' },
    '38:98:F5': { name: 'Samsung', type: 'smartphone' },
    'D4:E8:B2': { name: 'Samsung', type: 'smartphone' },
    'DA:A1:19': { name: 'Google', type: 'smartphone' },
    '3C:5A:B4': { name: 'Google', type: 'smartphone' },
    '64:90:C1': { name: 'Xiaomi', type: 'smartphone' },
    '0C:B8:15': { name: 'Xiaomi', type: 'smartphone' },
    '28:6C:07': { name: 'Xiaomi', type: 'smartphone' },
    'CC:A2:23': { name: 'Huawei', type: 'smartphone' },
    'D8:49:0B': { name: 'Huawei', type: 'smartphone' },

    // --- Laptops / Computers ---
    '48:51:B7': { name: 'Intel', type: 'laptop' },
    'DC:F5:05': { name: 'Intel', type: 'laptop' },
    '08:3E:8E': { name: 'Lenovo', type: 'laptop' },
    '20:76:8F': { name: 'Lenovo', type: 'laptop' },
    '00:0C:6E': { name: 'ASUS', type: 'laptop' },
    '10:7B:44': { name: 'ASUS', type: 'laptop' },
    '18:06:FF': { name: 'Acer', type: 'laptop' },
    '00:01:E6': { name: 'HP', type: 'laptop' },
    '00:08:74': { name: 'Dell', type: 'laptop' },
    '28:18:78': { name: 'Microsoft', type: 'laptop' },

    // --- Audio (Speakers/Earphones) ---
    '00:0C:8A': { name: 'Bose', type: 'audio' },
    '04:52:C7': { name: 'Bose', type: 'audio' },
    '00:1B:66': { name: 'Sennheiser', type: 'audio' },
    '00:1D:C9': { name: 'JBL/Harman', type: 'audio' },
    '08:EB:ED': { name: 'JBL/Harman', type: 'audio' },
    '00:1A:11': { name: 'Beats', type: 'audio' },
    '00:01:4A': { name: 'Sony Audio', type: 'audio' },

    // --- TVs ---
    '00:05:C9': { name: 'LG TV', type: 'tv' },
    '3C:BD:C5': { name: 'LG TV', type: 'tv' },
    '00:07:AB': { name: 'Samsung TV', type: 'tv' },
    '00:13:A9': { name: 'Sony TV', type: 'tv' },

    // --- Tags ---
    '00:13:20': { name: 'Tile', type: 'tag' },
    '00:1F:B5': { name: 'TrackR', type: 'tag' },

    // --- IoT / Embedded ---
    '40:B4:1D': { name: 'Espressif', type: 'iot' },
    '30:B4:1D': { name: 'Espressif', type: 'iot' },
    '20:B4:1D': { name: 'Espressif', type: 'iot' },
    '10:B4:1D': { name: 'Espressif', type: 'iot' },
    '24:6F:28': { name: 'Espressif', type: 'iot' },
    'A4:CF:12': { name: 'Espressif', type: 'iot' },
    '8C:AA:B5': { name: 'Espressif', type: 'iot' },

    // --- Network ---
    '00:00:0C': { name: 'Cisco', type: 'network' },
};

export function getVendorInfo(mac?: string): { name: string, type: string } {
    if (!mac) return { name: 'Unknown', type: 'generic' };

    const cleanMac = mac.toUpperCase();
    const prefix = cleanMac.slice(0, 8); // Gets "XX:XX:XX"

    const info = OUI_MAP[prefix];
    if (info) return info;

    // Detect if it's a Randomized MAC (Privacy MAC)
    const firstByte = parseInt(cleanMac.split(':')[0], 16);
    if (!isNaN(firstByte) && (firstByte & 0x02)) {
        return { name: 'Randomized Device', type: 'smartphone' };
    }

    return { name: 'Generic Device', type: 'generic' };
}
