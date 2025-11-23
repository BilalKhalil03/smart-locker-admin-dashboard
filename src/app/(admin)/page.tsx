"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import { db } from "@/lib/FirebaseClient"; // keep your path as-is
import { collection, onSnapshot } from "firebase/firestore";

/**
 * DASHBOARD (LIVE)
 *
 * ✅ READS FROM FIRESTORE:
 *   - /lockers
 *
 * Computes KPIs using REAL firestore fields (no fake data).
 * No writes happen on this page.
 */

type LockerStatus =
  | "locked"
  | "unlocked"
  | "offline"
  | "malfunction"
  | "reserved"
  | "available";

type Locker = {
  id: string;                 // Firestore doc id like "L-101"
  status?: LockerStatus;      // current locker state
  reservationUntil?: any;     // Firestore Timestamp | null (REAL reserved flag)
};

export default function DashboardPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ LIVE READ:
   * Subscribe to /lockers collection.
   * Any locker change updates this dashboard instantly.
   */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lockers"), (snap) => {
      setLockers(
        snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            status: data.status,
            reservationUntil: data.reservationUntil, // ✅ pull real reserved field
          };
        })
      );
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Total lockers = number of docs in /lockers
  const total = lockers.length;

  /**
   * Reserved lockers (REAL)
   * If reservationUntil is NOT null, that locker is reserved right now.
   */
  const reservedCount = useMemo(
    () => lockers.filter((l) => l.reservationUntil != null).length,
    [lockers]
  );

  /**
   * Offline/malfunction flags (REAL)
   * Counts lockers with warning states.
   */
  const flags = useMemo(
    () =>
      lockers.filter(
        (l) => l.status === "offline" || l.status === "malfunction"
      ).length,
    [lockers]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Lockers"
          value={loading ? "…" : `${total}`}
          hint="docs in /lockers"
        />
        <StatCard
          title="Reserved Lockers"
          value={loading ? "…" : `${reservedCount}`}
          hint="reservationUntil != null"
        />
        <StatCard
          title="Flags"
          value={loading ? "…" : `${flags}`}
          hint="offline + malfunction"
        />
      </div>

      {/* Placeholder until logs exist */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400 mb-2">Recent Activity</p>
        <p className="text-sm text-zinc-500">
          TODO: Add /logs collection for unlocks, reservations, alerts.
        </p>
      </div>
    </div>
  );
}
