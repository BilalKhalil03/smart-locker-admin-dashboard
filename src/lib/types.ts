// Central place to keep shared domain types.
// Keep this file in sync with the mobile app’s data model.

export type LockerStatus = "available" | "occupied" | "offline" | "malfunction";

export type Locker = {
  id: string;                       // Firestore doc ID (e.g., "L-101")
  size: "S" | "M" | "L";            // physical size
  status: LockerStatus;             // live status from ESP32/Cloud Functions
  pricePerHour: number;             // current price configured by admin
  location: { name: string; lat: number; lng: number }; // for map view later
  updatedAt?: any;                  // Firestore Timestamp (when wired)
};
