"use client";
import EmptyState from "@/components/EmptyState";

/**
 * Analytics (Revenue vs. Spending)
 * TODO(data):
 *  - Aggregate monthly revenue from /reservations (sum amount)
 *  - Aggregate monthly spending (from config or /spending collection)
 *  - Render with Recharts <LineChart/> once data is available
 *  - Consider Cloud Functions to pre-aggregate for performance
 */
export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Analytics — Revenue vs Spending</h2>

      <EmptyState
        title="Charts not connected"
        subtitle="Bind a line chart to aggregated Firestore data (monthly)."
        action={
          <code className="text-xs bg-black/30 px-2 py-1 rounded">
            {/* TODO: <ResponsiveContainer><LineChart data={series}>...</LineChart></ResponsiveContainer> */}
          </code>
        }
      />
    </div>
  );
}
