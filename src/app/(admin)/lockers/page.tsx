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
 *   - updateDoc(doc(db, "lockers", id)) -> update price & lockState
 *   - deleteDoc(doc(db, "lockers", id)) -> remove locker
 *
 * Your CURRENT Firestore schema (from your screenshots):
 *
 * lockers/{docId}:
 *  - id: string (optional, redundant)
 *  - label: string
 *  - location: string
 *
 *  - status: string
 *      ex: "open" | "closed" (reed switch door state)
 *          "reserved" | "available" (app-defined state)
 *          "offline" | "malfunction" (health flags)
 *
 *  - lockState: 0 | 1
 *      0 = locked
 *      1 = unlocked
 *      (this is what admin button controls)
 *
 *  - reservationUntil: Timestamp | ISO string | null
 *      (right now you store ISO string, so we support both formats)
 *
 *  - lastUpdated: Timestamp
 *  - pricePerHour: number
 *  - size: "S" | "M" | "L" (optional)
 */

// We keep status flexible because your DB uses multiple values
type DoorStatus = string;

// Lock state is strictly numeric per your requirement
type LockState = 0 | 1; // 0 = locked, 1 = unlocked

type Locker = {
  id: string;              // Firestore doc ID (ex: "L-101")
  label?: string;
  location?: string;

  // ✅ Door / reed switch status (Firestore field: status)
  doorStatus?: DoorStatus;

  // ✅ Solenoid lock state (Firestore field: lockState)
  lockState?: LockState;

  reservationUntil?: any;  // Timestamp OR ISO string OR null
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
   * - doorStatus here is only an INITIAL value.
   *   The ESP32 or mobile app may overwrite status later.
   * - lockState initializes to 0 (locked).
   */
  const [form, setForm] = useState({
    id: "",
    label: "",
    location: "",
    doorStatus: "closed",  // initial door state
    pricePerHour: 2.0,
    size: "M" as "S" | "M" | "L",
  });

  /**
   * ✅ LIVE READ:
   * Subscribe to /lockers collection.
   * Any updates from mobile or ESP32 show instantly.
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

            // Firestore -> UI mapping
            doorStatus: data.status,     // ✅ reads door/app status
            lockState: data.lockState,   // ✅ reads numeric lock state

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

  /**
   * Format reservationUntil safely.
   *
   * Firestore can store dates as:
   * 1) Timestamp (has .toDate())
   * 2) ISO string (like your screenshot)
   * 3) JS Date
   *
   * This supports all three.
   */
  const fmtReservedUntil = (val: any) => {
    if (!val) return "—";

    // Case 1: Firestore Timestamp
    if (typeof val?.toDate === "function") {
      return val.toDate().toLocaleString();
    }

    // Case 2: ISO string
    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? "—" : d.toLocaleString();
    }

    // Case 3: JS Date
    if (val instanceof Date) {
      return val.toLocaleString();
    }

    return "—";
  };

  /**
   * Door Status pill (reed switch or app status).
   * We color known values, otherwise show gray pill.
   */
  const doorStatusPill = (s?: DoorStatus) => {
    const status = (s ?? "unknown").toLowerCase();

    const map: Record<string, string> = {
      open: "bg-blue-600/20 text-blue-300",
      closed: "bg-emerald-600/20 text-emerald-300",
      reserved: "bg-amber-600/20 text-amber-300",
      available: "bg-emerald-600/20 text-emerald-300",
      offline: "bg-zinc-700/40 text-zinc-300",
      malfunction: "bg-rose-600/20 text-rose-300",
      locked: "bg-emerald-600/20 text-emerald-300",
      unlocked: "bg-blue-600/20 text-blue-300",
      unknown: "bg-zinc-700/40 text-zinc-300",
    };

    const cls = map[status] ?? map.unknown;

    return (
      <span className={`px-2 py-1 rounded text-xs ${cls}`}>
        {s ?? "unknown"}
      </span>
    );
  };

  /**
   * Lock State pill (solenoid).
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

      // ✅ Initial reed/app door status
      status: form.doorStatus,

      // ✅ Initial solenoid lock state
      lockState: 0,

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
   * Toggle lockState directly in Firestore:
   * 0 -> 1 (unlock)
   * 1 -> 0 (lock)
   *
   * This is your solenoid control state.
   */
  const toggleLockState = async (locker: Locker) => {
    try {
      const current: LockState = locker.lockState ?? 0;
      const next: LockState = current === 0 ? 1 : 0;

      await updateDoc(doc(db, "lockers", locker.id), {
        lockState: next,
        lastUpdated: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to toggle lockState:", err);
      alert("Failed to toggle lockState. Check console.");
    }
  };

  /**
   * Reserved count (simple):
   * counts any locker that has a reservationUntil value.
   *
   * If you later want "reserved only when until>now",
   * tell me and we’ll switch to a future-only check.
   */
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
                  setForm({ ...form, doorStatus: e.target.value })
                }
              >
                <option value="closed">closed</option>
                <option value="open">open</option>
                <option value="available">available</option>
                <option value="reserved">reserved</option>
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

              {/* Two distinct status columns */}
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

                {/* Door state from reed/app (status) */}
                <td className="p-3 text-center">
                  {doorStatusPill(l.doorStatus)}
                </td>

                {/* Lock state from solenoid (lockState) */}
                <td className="p-3 text-center">
                  {lockStatePill(l.lockState)}
                </td>

                {/* reservationUntil now renders even if ISO string */}
                <td className="p-3 text-center">
                  {fmtReservedUntil(l.reservationUntil)}
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
