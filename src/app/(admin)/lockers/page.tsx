"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/FirebaseClient";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * LOCKERS PAGE (LIVE)
 *
 * ✅ READS FROM:
 *   - collection(db, "lockers")  -> realtime list of lockers
 *
 * ✅ WRITES TO:
 *   - setDoc(doc(db, "lockers", id)) -> add locker
 *   - updateDoc(doc(db, "lockers", id)) -> update price, lockState, etc.
 *   - deleteDoc(doc(db, "lockers", id)) -> remove locker
 *
 * Your CURRENT Firestore schema (based on screenshots):
 *
 * lockers/{docId}:
 *  - id: string (optional)
 *  - label: string
 *  - location: string
 *
 *  - status: "open" | "closed"          <-- DOOR STATUS (reed switch)
 *  - lockState: 0 | 1                   <-- LOCK STATUS (solenoid)
 *
 *  - reservationUntil: Timestamp | null
 *  - lastUpdated: Timestamp
 *  - pricePerHour: number (you added)
 *  - size: "S" | "M" | "L" (optional)
 */

// Door status comes from reed switch (status field in Firestore)
type DoorStatus = "open" | "closed" | "unknown";

// Lock state comes from solenoid control (lockState field in Firestore)
type LockState = 0 | 1; // 0 = locked, 1 = unlocked

type Locker = {
  id: string;              // Firestore doc ID (ex: "L-101")
  label?: string;
  location?: string;

  // ✅ Door reed switch state (Firestore field: status)
  doorStatus?: DoorStatus;

  // ✅ Solenoid lock state (Firestore field: lockState)
  lockState?: LockState;

  reservationUntil?: any;  // Firestore Timestamp or null
  lastUpdated?: any;       // Firestore Timestamp

  pricePerHour?: number;
  size?: "S" | "M" | "L";
};

export default function LockersPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);

  /**
   * Add Locker form (admin inputs).
   *
   * NOTE:
   * - doorStatus is only an initial value.
   *   The ESP32 / reed switch will overwrite status live later.
   * - lockState initializes to 0 (locked).
   */
  const [form, setForm] = useState({
    id: "",
    label: "",
    location: "",
    doorStatus: "closed" as DoorStatus,
    pricePerHour: 2.0,
    size: "M" as "S" | "M" | "L",
  });

  /**
   * ✅ LIVE READ:
   * Subscribe to /lockers collection.
   * Any updates from mobile app or ESP32 show up instantly.
   */
  useEffect(() => {
    const q = query(collection(db, "lockers"), orderBy("label"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Locker[] = snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            label: data.label,
            location: data.location,

            // Map Firestore fields -> UI fields
            doorStatus: data.status,     // ✅ Firestore "status" is door open/closed
            lockState: data.lockState,   // ✅ Firestore numeric lock state

            reservationUntil: data.reservationUntil,
            lastUpdated: data.lastUpdated,
            pricePerHour: data.pricePerHour,
            size: data.size,
          };
        });

        setLockers(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Lockers snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /** Format Firestore Timestamp safely */
  const fmtTS = (ts: any) =>
    ts?.toDate?.()?.toLocaleString?.() ?? "—";

  /**
   * Door Status pill (reed switch)
   * Shows open/closed clearly.
   */
  const doorStatusPill = (s?: DoorStatus) => {
    const map: Record<string, string> = {
      open: "bg-blue-600/20 text-blue-300",
      closed: "bg-emerald-600/20 text-emerald-300",
      unknown: "bg-zinc-700/40 text-zinc-300",
    };
    const cls = map[s ?? "unknown"] ?? map.unknown;
    return (
      <span className={`px-2 py-1 rounded text-xs ${cls}`}>
        {s ?? "unknown"}
      </span>
    );
  };

  /**
   * Lock State pill (solenoid)
   * lockState: 0=locked, 1=unlocked
   */
  const lockStatePill = (lockState?: LockState) => {
    const isUnlocked = lockState === 1;
    return (
      <span
        className={`px-2 py-1 rounded text-xs ${
          isUnlocked
            ? "bg-blue-600/20 text-blue-300"
            : "bg-emerald-600/20 text-emerald-300"
        }`}
      >
        {isUnlocked ? "unlocked" : "locked"}
      </span>
    );
  };

  /**
   * ✅ WRITE:
   * Adds a new locker doc to Firestore.
   * Doc ID becomes the locker ID.
   */
  const addLocker = async () => {
    if (!form.id.trim()) return alert("Locker ID required");

    const ref = doc(db, "lockers", form.id.trim());

    await setDoc(ref, {
      id: form.id.trim(),
      label: form.label || form.id.trim(),
      location: form.location || "Unknown",

      // ✅ initial door status (reed)
      status: form.doorStatus,

      // ✅ initial lock state (solenoid)
      lockState: 0, // default locked

      reservationUntil: null,
      lastUpdated: serverTimestamp(),

      pricePerHour: Number(form.pricePerHour),
      size: form.size,
    });

    setShowAdd(false);
    setForm({
      id: "",
      label: "",
      location: "",
      doorStatus: "closed",
      pricePerHour: 2.0,
      size: "M",
    });
  };

  /**
   * ✅ WRITE:
   * Removes locker doc entirely.
   */
  const removeLocker = async (id: string) => {
    if (!confirm(`Remove locker ${id}?`)) return;
    await deleteDoc(doc(db, "lockers", id));
  };

  /**
   * ✅ WRITE:
   * Update pricePerHour only.
   */
  const savePrice = async (id: string, pricePerHour: number) => {
    await updateDoc(doc(db, "lockers", id), {
      pricePerHour,
      lastUpdated: serverTimestamp(),
    });
  };

  /**
   * ✅ WRITE:
   * Toggle lockState directly:
   * 0 -> 1 (unlock)
   * 1 -> 0 (lock)
   *
   * IMPORTANT:
   * This is your solenoid control state.
   * ESP32 should listen for this change if you're not using commands now.
   */
  const toggleLockState = async (locker: Locker) => {
    try {
      const current: LockState = locker.lockState ?? 0;
      const next: LockState = current === 0 ? 1 : 0;

      await updateDoc(doc(db, "lockers", locker.id), {
        lockState: next,
        lastUpdated: serverTimestamp(),

        // OPTIONAL:
        // If you want solenoid state to also affect "status",
        // uncomment this. But usually reed switch should own status.
        // status: next === 1 ? "open" : "closed",
      });
    } catch (err) {
      console.error("Failed to toggle lockState:", err);
      alert("Failed to toggle lockState. Check console.");
    }
  };

  const reservedCount = useMemo(
    () => lockers.filter((l) => l.reservationUntil != null).length,
    [lockers]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Locker Control</h2>
        <div className="text-xs text-zinc-400">
          Total: {lockers.length} • Reserved: {reservedCount}
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          + Add Locker
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <h3 className="font-medium">Add Locker</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Locker ID (doc id)
              <input
                className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="L-301"
              />
            </label>

            <label className="text-sm">
              Label
              <input
                className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="North Wing A1"
              />
            </label>
          </div>

          <label className="text-sm block">
            Location (string)
            <input
              className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Level 1 · North Wing"
            />
          </label>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm">
              Size
              <select
                className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
                value={form.size}
                onChange={(e) =>
                  setForm({ ...form, size: e.target.value as any })
                }
              >
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </label>

            <label className="text-sm">
              Price ($/hr)
              <input
                type="number"
                step="0.1"
                className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
                value={form.pricePerHour}
                onChange={(e) =>
                  setForm({ ...form, pricePerHour: Number(e.target.value) })
                }
              />
            </label>

            <label className="text-sm">
              Door Status (initial)
              <select
                className="w-full mt-1 bg-transparent border border-zinc-700 rounded px-2 py-1"
                value={form.doorStatus}
                onChange={(e) =>
                  setForm({ ...form, doorStatus: e.target.value as DoorStatus })
                }
              >
                <option value="closed">closed</option>
                <option value="open">open</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 rounded bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={addLocker}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Label</th>
              <th className="p-3 text-left">Location</th>

              {/* NEW: two distinct status columns */}
              <th className="p-3 text-center">Door (reed)</th>
              <th className="p-3 text-center">Lock (solenoid)</th>

              <th className="p-3 text-center">Reserved Until</th>
              <th className="p-3 text-center">$/hr</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={8} className="p-4 text-zinc-400">
                  Loading lockers...
                </td>
              </tr>
            )}

            {!loading && lockers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-zinc-400">
                  No lockers yet.
                </td>
              </tr>
            )}

            {lockers.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-900/60">
                <td className="p-3">{l.id}</td>
                <td className="p-3">{l.label ?? "—"}</td>
                <td className="p-3">{l.location ?? "—"}</td>

                {/* Door state from reed switch */}
                <td className="p-3 text-center">
                  {doorStatusPill(l.doorStatus)}
                </td>

                {/* Lock state from solenoid */}
                <td className="p-3 text-center">
                  {lockStatePill(l.lockState)}
                </td>

                <td className="p-3 text-center">
                  {fmtTS(l.reservationUntil)}
                </td>

                <td className="p-3 text-center">
                  <input
                    defaultValue={l.pricePerHour ?? 0}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-24 bg-transparent border border-zinc-700 rounded px-2 py-1"
                    onBlur={(e) =>
                      savePrice(l.id, Number(e.target.value))
                    }
                  />
                </td>

                <td className="p-3 space-x-2 text-center">
                  {/* Button toggles lockState */}
                  <button
                    className="px-2 py-1 rounded bg-emerald-700/30 hover:bg-emerald-700/50"
                    onClick={() => toggleLockState(l)}
                  >
                    {l.lockState === 1 ? "Lock" : "Unlock"}
                  </button>

                  <button
                    className="px-2 py-1 rounded bg-rose-700/30 hover:bg-rose-700/50"
                    onClick={() => removeLocker(l.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
