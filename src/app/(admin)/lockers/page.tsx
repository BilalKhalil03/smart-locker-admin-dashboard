"use client";
import EmptyState from "@/components/EmptyState";

/**
 * Lockers Management
 * TODO(data):
 *  - Read:   onSnapshot(collection(db, "lockers")) → table rows
 *  - Add:    setDoc(doc(db,"lockers", id), payload)  (via modal)
 *  - Remove: deleteDoc(doc(db,"lockers", id))
 *  - Update: updateDoc(doc(db,"lockers", id), { pricePerHour })
 *  - Unlock: call Cloud Function (or write a /commands doc consumed by ESP32)
 *
 * UI Notes:
 *  - This page starts as a placeholder block. Once wired, replace EmptyState
 *    with a table + simple form modal for adding lockers.
 */
export default function LockersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Locker Control</h2>

        {/* TODO(ui): open "Add Locker" modal, collect id/size/location/pricePerHour */}
        <button
          className="ml-auto px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          title="Add a new locker"
        >
          + Add Locker
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <EmptyState
          title="No locker data"
          subtitle="Connect Firestore to list and manage lockers."
          action={
            <div className="text-left text-xs space-y-1 bg-black/30 p-3 rounded">
              <div>// TODO: Render a table:</div>
              <div>• columns: ID | Location | Size | Status | $/hr | Actions</div>
              <div>• actions: Unlock (Function), Remove (deleteDoc), Save Price (updateDoc)</div>
            </div>
          }
        />
      </div>
    </div>
  );
}
