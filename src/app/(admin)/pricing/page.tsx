"use client";
import EmptyState from "@/components/EmptyState";

/**
 * Pricing (Bulk Adjust)
 * TODO(data):
 *  - Load all lockers; let admins apply a global price or by group (size/location)
 *  - Implement batched writes (or per-doc updateDoc) for updates
 *  - Show preview cards per locker with current price
 */
export default function PricingPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pricing</h2>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Set all lockers to:</span>
          <input
            type="number"
            step="0.1"
            min={0}
            placeholder="$/hr"
            className="w-28 bg-transparent border border-zinc-700 rounded px-2 py-1"
            // TODO(ui): store local state; use onClick below to apply
          />
          <button
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
            title="Apply to all lockers"
            // TODO(data): loop updateDoc(...) or batch
          >
            Apply to All
          </button>
        </div>
      </div>

      <EmptyState
        title="No pricing preview"
        subtitle="Once lockers load, show cards listing current prices and locations."
      />
    </div>
  );
}
