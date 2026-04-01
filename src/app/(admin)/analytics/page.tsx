"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/FirebaseClient";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import UsageSection from "@/components/analytics/UsageSection";
import UsageList from "@/components/analytics/UsageList";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/**
 * ANALYTICS PAGE (LIVE + CHARTS)
 *
 * ✅ READS FROM FIRESTORE:
 *   - /reservations collection
 *
 * ❌ DOES NOT WRITE TO FIRESTORE
 *
 * Current reservation schema:
 * reservations/{docId}
 *  - createdAt: Timestamp
 *  - startAt: Timestamp
 *  - endAt: string (ISO date)
 *  - lockerId: string
 *  - status: string
 *  - userId: string
 *
 * This page calculates and displays:
 *  - total reservations
 *  - average reservation duration
 *  - peak hour
 *  - unique users
 *  - reservations per day (bar chart)
 *  - most-used lockers (list)
 *  - reservation status breakdown (pie chart)
 */

type Reservation = {
  lockerId?: string;
  createdAt?: any;
  startAt?: any;
  endAt?: any;
  status?: string;
  userId?: string;
};

const PIE_COLORS = [
  "#60a5fa", // blue
  "#34d399", // green
  "#fbbf24", // amber
  "#f87171", // red
  "#a78bfa", // purple
  "#94a3b8", // slate
];

export default function AnalyticsPage() {
  // Holds live Firestore reservation docs
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ LIVE READ:
   * Subscribe to /reservations so analytics updates automatically.
   */
  useEffect(() => {
    const qRes = query(
      collection(db, "reservations"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qRes,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Reservation);
        setReservations(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Reservations snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /**
   * Helper:
   * Convert Firestore Timestamp, ISO string, or JS Date into a Date.
   */
  const parseDate = (value: any): Date | null => {
    if (!value) return null;

    // Firestore Timestamp
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    // ISO string
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }

    // JS Date
    if (value instanceof Date) {
      return value;
    }

    return null;
  };

  /**
   * KPI 1: Total reservations
   */
  const totalReservations = reservations.length;

  /**
   * KPI 2: Average reservation duration in minutes
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
   * KPI 3: Peak reservation start hour
   */
  const peakHour = useMemo(() => {
    const hourCounts = new Array(24).fill(0);

    reservations.forEach((r) => {
      const start = parseDate(r.startAt);
      if (!start) return;

      const hour = start.getHours();
      hourCounts[hour]++;
    });

    const max = Math.max(...hourCounts);
    if (max === 0) return null;

    return hourCounts.indexOf(max);
  }, [reservations]);

  /**
   * KPI 4: Unique users
   */
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();

    reservations.forEach((r) => {
      if (r.userId) users.add(r.userId);
    });

    return users.size;
  }, [reservations]);

  /**
   * Reservations per day
   * Used for the bar chart.
   */
  const reservationsPerDay = useMemo(() => {
    const map: Record<string, number> = {};

    reservations.forEach((r) => {
      const created = parseDate(r.createdAt);
      if (!created) return;

      const key = created.toISOString().slice(0, 10); // YYYY-MM-DD
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({
        day,
        count,
      }));
  }, [reservations]);

  /**
   * Most-used lockers
   * Used in the list section.
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
   * Status breakdown
   * Used in the pie chart.
   */
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};

    reservations.forEach((r) => {
      const status = (r.status ?? "unknown").toLowerCase();
      map[status] = (map[status] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
      }));
  }, [reservations]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Usage Analytics</h2>
      <p className="text-sm text-zinc-400">
        Live reservation data from Firestore is visualized below for expo/demo use.
      </p>

      {/* Top KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <UsageSection
          title="Total Reservations"
          value={loading ? "…" : `${totalReservations}`}
          hint="Docs in /reservations"
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
          hint="Most common start hour"
        />

        <UsageSection
          title="Unique Users"
          value={loading ? "…" : `${uniqueUsers}`}
          hint="Distinct userId count"
        />
      </div>

      {/* Reservations Per Day Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-3">Reservations Per Day</h3>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading chart…</p>
        ) : reservationsPerDay.length === 0 ? (
          <p className="text-sm text-zinc-500">No reservation trend data yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reservationsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top lockers list */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium mb-3">Most-Used Lockers</h3>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading top lockers…</p>
          ) : (
            <UsageList items={topLockers} />
          )}
        </div>

        {/* Status pie chart */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium mb-3">Reservation Status Breakdown</h3>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading status chart…</p>
          ) : statusBreakdown.length === 0 ? (
            <p className="text-sm text-zinc-500">No status data available yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}