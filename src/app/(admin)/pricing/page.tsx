"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/FirebaseClient";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * PRICING PAGE (LIVE)
 *
 * ✅ READS FROM:
 *   - /lockers collection (pricePerHour field)
 *
 * ✅ WRITES TO:
 *   - updateDoc(locker) to change pricePerHour
 */

type Locker = {
  id: string;
  label?: string;
  location?: string;
  pricePerHour?: number;
};

export default function PricingPage() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalPrice, setGlobalPrice] = useState<number>(2.0);
  const [saving, setSaving] = useState(false);

  /**
   * ✅ LIVE READ:
   * Subscribe to lockers so prices update automatically.
   */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lockers"), (snap) => {
      setLockers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /**
   * ✅ WRITE:
   * bulk update to apply a price to ALL lockers.
   */
  const applyGlobal = async () => {
    if (!confirm(`Apply $${globalPrice}/hr to ALL lockers?`)) return;

    setSaving(true);
    try {
      await Promise.all(
        lockers.map((l) =>
          updateDoc(doc(db, "lockers", l.id), {
            pricePerHour: globalPrice,
            lastUpdated: serverTimestamp(),
          })
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pricing</h2>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center gap-3">
        <span className="text-sm text-zinc-400">Set all lockers to:</span>

        <input
          type="number"
          step="0.1"
          min={0}
          className="w-28 bg-transparent border border-zinc-700 rounded px-2 py-1"
          value={globalPrice}
          onChange={(e) => setGlobalPrice(Number(e.target.value))}
        />

        <button
          onClick={applyGlobal}
          disabled={saving || lockers.length === 0}
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm disabled:opacity-50"
        >
          {saving ? "Applying…" : "Apply to All"}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && (
          <p className="text-sm text-zinc-500">Loading lockers…</p>
        )}

        {!loading && lockers.length === 0 && (
          <p className="text-sm text-zinc-500">No lockers yet.</p>
        )}

        {lockers.map((l) => (
          <div
            key={l.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
          >
            <p className="text-sm font-medium">{l.label ?? l.id}</p>
            <p className="text-xs text-zinc-400 mt-1">{l.location ?? "—"}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Current: ${(l.pricePerHour ?? 0).toFixed(2)}/hr
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
