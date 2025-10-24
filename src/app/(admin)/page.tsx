"use client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";

/**
 * Dashboard Overview
 * TODO(data):
 *  - Bind KPI tiles to Firestore:
 *    * Total Lockers → count(/lockers)
 *    * Occupied Now  → count(status == "occupied")
 *    * Flags         → count(status in ["offline","malfunction"])
 *  - Activity feed from /logs (recent unlocks/reservations/alerts)
 */
export default function Page() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Total Lockers"   value="—" hint="Bind to /lockers count" />
        <StatCard title="Occupied Now"    value="—" hint="status == 'occupied'" />
        <StatCard title="Flags"           value="—" hint="offline + malfunction" />
      </div>

      <EmptyState
        title="Activity Feed"
        subtitle="Show recent events from /logs (reservations, unlocks, alerts)."
      />
    </div>
  );
}
