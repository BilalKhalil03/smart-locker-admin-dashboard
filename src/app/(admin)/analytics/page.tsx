"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/FirebaseClient";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import UsageSection from "@/components/analytics/UsageSection";
import UsageList from "@/components/analytics/UsageList";

/**
 * ANALYTICS PAGE (LIVE)
 *
 * ✅ READS FROM FIRESTORE:
 *   collection(db, "reservations")
 *
 * Your CURRENT Firestore schema (from screenshot):
 * reservations/{docId} includes:
 *  - createdAt: Timestamp
 *  - startAt: Timestamp
 *  - endAt: string (ISO date)
 *  - lockerId: string
 *  - status: string ("active", ...)
 *  - userId: string
 *
 * This file computes usage analytics using ONLY what exists now.
 * If you add revenue fields later, we can extend this page.
 */

// Type describing your reservation documents
type Reservation = {
  lockerId?: string;
  createdAt?: any;   // Firestore Timestamp
  startAt?: any;     // Firestore Timestamp
  endAt?: string | any; // ISO string currently, but may become Timestamp later
  status?: string;
  userId?: string;
};

export default function AnalyticsPage() {
  // Holds ALL reservations live from Firestore
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ LIVE READ:
   * onSnapshot listens to /reservations in real-time.
   * Any new reservation from the mobile app will instantly update analytics.
   */
  useEffect(() => {
    const qRes = query(
      collection(db, "reservations"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qRes,
      (snap) => {
        // Convert snapshot -> plain JS objects
        const rows = snap.docs.map((d) => d.data() as Reservation);
        setReservations(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Reservations snapshot error:", err);
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => unsub();
  }, []);

  /** Total reservations in DB */
  const totalReservations = reservations.length;

  /**
   * Helper: Convert Firestore Timestamp OR ISO string into Date.
   * - startAt is a Firestore timestamp
   * - endAt is currently stored as ISO string
   */
  const parseDate = (value: any): Date | null => {
    if (!value) return null;

    // Firestore Timestamp case
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    // ISO string case
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  };

  /**
   * Average reservation duration in minutes:
   * avg(endAt - startAt)
   */
  const avgDurationMin = useMemo(() => {
    const durations: number[] = [];

    reservations.forEach((r) => {
      const start = parseDate(r.startAt);
      const end = parseDate(r.endAt);

      if (!start || !end) return;

      const diffMin = (end.getTime() - start.getTime()) / 60000;
      if (diffMin > 0) durations.push(diffMin);
    });

    if (!durations.length) return null;

    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [reservations]);

  /**
   * Peak usage hour:
   * counts which hour of day reservations start most often.
   */
  const peakHour = useMemo(() => {
    const hourCounts = new Array(24).fill(0);

    reservations.forEach((r) => {
      const start = parseDate(r.startAt);
      if (!start) return;

      const h = start.getHours();
      hourCounts[h]++;
    });

    const max = Math.max(...hourCounts);
    if (max === 0) return null;

    return hourCounts.indexOf(max);
  }, [reservations]);

  /**
   * Top 5 lockers by number of reservations.
   */
  const topLockers = useMemo(() => {
    const counts: Record<string, number> = {};

    reservations.forEach((r) => {
      if (!r.lockerId) return;
      counts[r.lockerId] = (counts[r.lockerId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([lockerId, count]) => ({ lockerId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reservations]);

  /**
   * Reservations per day:
   * groups by createdAt date (YYYY-MM-DD).
   */
  const reservationsPerDay = useMemo(() => {
    const map: Record<string, number> = {};

    reservations.forEach((r) => {
      const created = parseDate(r.createdAt);
      if (!created) return;

      const key = created.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [reservations]);

  /**
   * Active vs expired/cancelled distribution
   * (uses your current status field).
   */
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      const s = r.status ?? "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reservations]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Usage Analytics</h2>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <UsageSection
          title="Total Reservations"
          value={loading ? "…" : `${totalReservations}`}
          hint="Count of docs in /reservations"
        />

        <UsageSection
          title="Avg. Duration"
          value={
            loading
              ? "…"
              : avgDurationMin == null
              ? "—"
              : `${avgDurationMin.toFixed(1)} min`
          }
          hint="avg(endAt - startAt)"
        />

        <UsageSection
          title="Peak Hour"
          value={
            loading
              ? "…"
              : peakHour == null
              ? "—"
              : `${peakHour}:00`
          }
          hint="Most common reservation start time"
        />
      </div>

      {/* Reservations trend section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-2">
          Reservations per day
        </h3>

        {loading && <p className="text-sm text-zinc-500">Loading…</p>}

        {!loading && reservationsPerDay.length === 0 && (
          <p className="text-sm text-zinc-500">No reservations yet.</p>
        )}

        {!loading && reservationsPerDay.length > 0 && (
          <ul className="text-sm space-y-1">
            {reservationsPerDay.map(([day, count]) => (
              <li
                key={day}
                className="flex justify-between border-b border-zinc-800 py-1"
              >
                <span>{day}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        )}

        {/* TODO(chart):
            Replace this list with a Line/Bar chart later if desired */}
      </div>

      {/* Top lockers section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-2">
          Most-used lockers
        </h3>
        <UsageList items={topLockers} />
      </div>

      {/* Status breakdown section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-2">
          Reservation status breakdown
        </h3>

        {statusBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {statusBreakdown.map(([status, count]) => (
              <li
                key={status}
                className="flex justify-between border-b border-zinc-800 py-1"
              >
                <span>{status}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
