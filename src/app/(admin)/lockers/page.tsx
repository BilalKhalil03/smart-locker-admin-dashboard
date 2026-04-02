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
  addDoc,
  documentId,
} from "firebase/firestore";

/**
 * LOCKERS PAGE (LIVE)
 *
 * ✅ READS FROM:
 *   - /lockers
 *
 * ✅ WRITES TO:
 *   - /lockers  (add / update / delete)
 *   - /logs     (activity records for admin actions)
 *
 * Firestore locker schema:
 * lockers/{docId}
 *  - id
 *  - label
 *  - location
 *  - status           // reed switch / door state
 *  - lockState        // 0 = locked, 1 = unlocked
 *  - reservationUntil
 *  - lastUpdated
 *  - pricePerHour
 *  - size
 *
 * Firestore logs schema written by this page:
 * logs/{autoId}
 *  - type
 *  - source
 *  - lockerId
 *  - message
 *  - details
 *  - createdAt
 */

type DoorStatus = string;
type LockState = 0 | 1;

type Locker = {
  id: string;
  label?: string;
  location?: string;
  doorStatus?: DoorStatus; // mapped from Firestore "status"
  lockState?: LockState;   // mapped from Firestore "lockState"
  reservationUntil?: any;
  lastUpdated?: any;
  pricePerHour?: number;
  size?: "S" | "M" | "L";
};

export default function LockersPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    id: "",
    label: "",
    location: "",
    doorStatus: "closed",
    pricePerHour: 2.0,
    size: "M" as "S" | "M" | "L",
  });

  /**
   * ✅ LIVE READ:
   * Realtime subscription to /lockers
   */
  useEffect(() => {
    // Sort by Firestore document ID so order matches the Firebase collection list better
    const q = query(collection(db, "lockers"), orderBy(documentId()));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Locker[] = snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            label: data.label,
            location: data.location,
            doorStatus: data.status,
            lockState: data.lockState,
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
   * Helper:
   * Write a log entry to /logs.
   * This lets the dashboard show true activity later.
   */
  const writeLog = async ({
    type,
    lockerId,
    message,
    details,
  }: {
    type: string;
    lockerId?: string;
    message: string;
    details?: Record<string, any>;
  }) => {
    try {
      await addDoc(collection(db, "logs"), {
        type,
        source: "admin-web",
        lockerId: lockerId ?? null,
        message,
        details: details ?? {},
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to write log:", err);
    }
  };

  /**
   * Formats reservationUntil safely.
   * Supports Timestamp, ISO string, or JS Date.
   */
  const fmtReservedUntil = (val: any) => {
    if (!val) return "—";

    if (typeof val?.toDate === "function") {
      return val.toDate().toLocaleString();
    }

    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? "—" : d.toLocaleString();
    }

    if (val instanceof Date) {
      return val.toLocaleString();
    }

    return "—";
  };

  /**
   * Door status pill:
   * shows reed/app state separately from solenoid lock state
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
   * Lock state pill:
   * 0 = locked, 1 = unlocked
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
   * Adds a new locker doc to /lockers
   * AND writes a log to /logs
   */
  const addLocker = async () => {
    if (!form.id.trim()) return alert("Locker ID required");

    const lockerId = form.id.trim();
    const ref = doc(db, "lockers", lockerId);

    await setDoc(ref, {
      id: lockerId,
      label: form.label || lockerId,
      location: form.location || "Unknown",
      status: form.doorStatus,
      lockState: 0, // default locked
      reservationUntil: null,
      lastUpdated: serverTimestamp(),
      pricePerHour: Number(form.pricePerHour),
      size: form.size,
    });

    await writeLog({
      type: "locker_added",
      lockerId,
      message: `Locker ${lockerId} was added by admin`,
      details: {
        label: form.label || lockerId,
        location: form.location || "Unknown",
        pricePerHour: Number(form.pricePerHour),
        size: form.size,
      },
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
   * Deletes a locker doc
   * AND writes a log
   */
  const removeLocker = async (id: string) => {
    if (!confirm(`Remove locker ${id}?`)) return;

    await deleteDoc(doc(db, "lockers", id));

    await writeLog({
      type: "locker_removed",
      lockerId: id,
      message: `Locker ${id} was removed by admin`,
    });
  };

  /**
   * ✅ WRITE:
   * Updates pricePerHour
   * AND writes a log
   */
  const savePrice = async (id: string, pricePerHour: number) => {
    await updateDoc(doc(db, "lockers", id), {
      pricePerHour,
      lastUpdated: serverTimestamp(),
    });

    await writeLog({
      type: "price_change",
      lockerId: id,
      message: `Price updated for locker ${id}`,
      details: {
        newPricePerHour: pricePerHour,
      },
    });
  };

  /**
   * ✅ WRITE:
   * Toggle lockState directly:
   * 0 -> 1 (unlock)
   * 1 -> 0 (lock)
   *
   * Also writes a log entry.
   */
  const toggleLockState = async (locker: Locker) => {
    try {
      const current: LockState = locker.lockState ?? 0;
      const next: LockState = current === 0 ? 1 : 0;

      await updateDoc(doc(db, "lockers", locker.id), {
        lockState: next,
        lastUpdated: serverTimestamp(),
      });

      await writeLog({
        type: next === 1 ? "unlock" : "lock",
        lockerId: locker.id,
        message: `Locker ${locker.id} was ${next === 1 ? "unlocked" : "locked"} by admin`,
        details: {
          oldLockState: current,
          newLockState: next,
        },
      });
    } catch (err) {
      console.error("Failed to toggle lockState:", err);
      alert("Failed to toggle lockState. Check console.");
    }
  };

  /**
   * Count reserved lockers.
   * For now, this simply checks whether reservationUntil exists.
   * If you want future-only reservations, we can tighten this later.
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

                <td className="p-3 text-center">
                  {doorStatusPill(l.doorStatus)}
                </td>

                <td className="p-3 text-center">
                  {lockStatePill(l.lockState)}
                </td>

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
                    onBlur={(e) => savePrice(l.id, Number(e.target.value))}
                  />
                </td>

                <td className="p-3 space-x-2 text-center">
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

/**
 * Helper UI function:
 * door status pill
 */
function doorStatusPill(s?: DoorStatus) {
  const status = (s ?? "unknown").toLowerCase();

  const map: Record<string, string> = {
    open: "bg-blue-600/20 text-blue-300",
    closed: "bg-emerald-600/20 text-emerald-300",
    reserved: "bg-amber-600/20 text-amber-300",
    available: "bg-emerald-600/20 text-emerald-300",
    offline: "bg-zinc-700/40 text-zinc-300",
    malfunction: "bg-rose-600/20 text-rose-300",
    unknown: "bg-zinc-700/40 text-zinc-300",
  };

  const cls = map[status] ?? map.unknown;

  return (
    <span className={`px-2 py-1 rounded text-xs ${cls}`}>
      {s ?? "unknown"}
    </span>
  );
}

/**
 * Helper UI function:
 * lock state pill
 */
function lockStatePill(lockState?: LockState) {
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
}

/**
 * Helper:
 * format reservationUntil safely
 */
function fmtReservedUntil(val: any) {
  if (!val) return "—";

  if (typeof val?.toDate === "function") {
    return val.toDate().toLocaleString();
  }

  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  if (val instanceof Date) {
    return val.toLocaleString();
  }

  return "—";
}