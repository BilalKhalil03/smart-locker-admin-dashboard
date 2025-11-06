"use client";

import UsageSection from "@/components/analytics/UsageSection";
import UsageList from "@/components/analytics/UsageList";
import EmptyState from "@/components/EmptyState";

/**
 * Usage Analytics page
 *
 * TODO(firebase):
 *  1. import { db } from "@/lib/firebaseClient";
 *  2. useEffect(() => onSnapshot(collection(db, "reservations"), ...), [])
 *  3. inside the listener:
 *      - build `reservationsPerDay`
 *      - build `topLockers`
 *      - build `avgDuration`
 *      - build `peakHour`
 *  4. set local state and render real values instead of "—"
 *
 * Until then, this page is a fully laid-out shell.
 */
export default function AnalyticsPage() {
  // placeholders until Firestore is ready
  const totalReservations = "—";
  const avgDuration = "—";
  const peakHour = "—";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Usage Analytics</h2>
      <p className="text-sm text-zinc-400">
        Once connected to Firestore, this page will show how often lockers are used, which ones are busiest,
        and at what times demand is highest.
      </p>

      {/* 1) summary usage metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <UsageSection
          title="Total Reservations"
          value={totalReservations}
          hint="TODO: count docs in /reservations for selected period"
        />
        <UsageSection
          title="Avg. Reservation Duration"
          value={avgDuration}
          hint="TODO: avg(endTime - startTime)"
        />
        <UsageSection
          title="Peak Hour"
          value={peakHour}
          hint="TODO: group by hour(startTime)"
        />
      </div>

      {/* 2) reservations over time */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium">Reservations over time</h3>
        <p className="text-xs text-zinc-400 mb-3">
          TODO(firebase): fetch /reservations filtered by date → group by day → feed to chart.
        </p>
        <EmptyState
          title="No time-series connected"
          subtitle="Add Firestore and aggregate by date to see trends."
        />
      </div>

      {/* 3) most-used lockers */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-3">Most-used lockers</h3>
        <p className="text-xs text-zinc-400 mb-3">
          TODO(firebase): from /reservations, count how many times each lockerId appears, then sort desc.
        </p>
        <UsageList items={[]} />
      </div>

      {/* 4) peak usage times */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-medium mb-3">Peak usage times</h3>
        <p className="text-xs text-zinc-400 mb-3">
          TODO(firebase): use reservation start times to calculate the busiest hour(s) of the day.
        </p>
        <EmptyState
          title="No peak-hour data"
          subtitle="Once timestamps are available, display a 24-hour bar chart."
        />
      </div>
    </div>
  );
}
