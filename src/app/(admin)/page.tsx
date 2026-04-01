"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import { db } from "@/lib/FirebaseClient";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";

/**
 * DASHBOARD PAGE (SIMPLIFIED + REAL LOGS)
 *
 * ✅ READS FROM FIRESTORE:
 *   - /lockers
 *   - /logs
 *
 * ❌ DOES NOT WRITE TO FIRESTORE
 *
 * This page shows:
 *   1. Total Lockers
 *   2. Reserved Lockers
 *   3. Flags
 *   4. Recent Activity (real logs from /logs)
 *
 * Current locker schema:
 * lockers/{docId}
 *  - status
 *  - lockState
 *  - reservationUntil
 *  - lastUpdated
 *
 * Current logs schema (written by lockers page):
 * logs/{autoId}
 *  - type
 *  - source
 *  - lockerId
 *  - message
 *  - details
 *  - createdAt
 */

type Locker = {
  id: string;
  status?: string;
  lockState?: 0 | 1;
  reservationUntil?: any;
  lastUpdated?: any;
};

type LogItem = {
  id: string;
  type?: string;
  source?: string;
  lockerId?: string | null;
  message?: string;
  details?: Record<string, any>;
  createdAt?: any;
};

export default function DashboardPage() {
  // Live locker data for KPI cards
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loadingLockers, setLoadingLockers] = useState(true);

  // Live logs for Recent Activity
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  /**
   * Helper:
   * Convert Firestore Timestamp, ISO string, or JS Date into Date.
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
   * ✅ LIVE READ: /lockers
   * Used for KPI cards.
   */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "lockers"),
      (snap) => {
        const rows: Locker[] = snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            status: data.status,
            lockState: data.lockState,
            reservationUntil: data.reservationUntil,
            lastUpdated: data.lastUpdated,
          };
        });

        setLockers(rows);
        setLoadingLockers(false);
      },
      (err) => {
        console.error("Lockers snapshot error:", err);
        setLoadingLockers(false);
      }
    );

    return () => unsub();
  }, []);

  /**
   * ✅ LIVE READ: /logs
   * Pull latest 10 real log entries for the dashboard.
   */
  useEffect(() => {
    const qLogs = query(
      collection(db, "logs"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(
      qLogs,
      (snap) => {
        const rows: LogItem[] = snap.docs.map((d) => {
          const data = d.data() as any;

          return {
            id: d.id,
            type: data.type,
            source: data.source,
            lockerId: data.lockerId,
            message: data.message,
            details: data.details,
            createdAt: data.createdAt,
          };
        });

        setLogs(rows);
        setLoadingLogs(false);
      },
      (err) => {
        console.error("Logs snapshot error:", err);
        setLoadingLogs(false);
      }
    );

    return () => unsub();
  }, []);

  /**
   * KPI 1: Total Lockers
   */
  const totalLockers = lockers.length;

  /**
   * KPI 2: Reserved Lockers
   * Counts only lockers whose reservationUntil is in the future.
   */
  const reservedLockers = useMemo(() => {
    const now = Date.now();

    return lockers.filter((locker) => {
      const d = parseDate(locker.reservationUntil);
      return d != null && d.getTime() > now;
    }).length;
  }, [lockers]);

  /**
   * KPI 3: Flags
   * Counts lockers that are offline or malfunctioning.
   */
  const flaggedLockers = useMemo(() => {
    return lockers.filter((locker) => {
      const s = locker.status?.toLowerCase();
      return s === "offline" || s === "malfunction";
    }).length;
  }, [lockers]);

  /**
   * Pretty date formatter for Recent Activity
   */
  const fmtDate = (value: any) => {
    const d = parseDate(value);
    return d ? d.toLocaleString() : "—";
  };

  /**
   * Small helper to color log type tags.
   */
  const logTypeClasses = (type?: string) => {
    switch ((type ?? "").toLowerCase()) {
      case "unlock":
        return "bg-blue-600/20 text-blue-300";
      case "lock":
        return "bg-emerald-600/20 text-emerald-300";
      case "price_change":
        return "bg-amber-600/20 text-amber-300";
      case "locker_added":
        return "bg-purple-600/20 text-purple-300";
      case "locker_removed":
        return "bg-rose-600/20 text-rose-300";
      default:
        return "bg-zinc-700/40 text-zinc-300";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>

      {/* Simple KPI cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Lockers"
          value={loadingLockers ? "…" : `${totalLockers}`}
          hint="Docs in /lockers"
        />

        <StatCard
          title="Reserved Lockers"
          value={loadingLockers ? "…" : `${reservedLockers}`}
          hint="reservationUntil > now"
        />

        <StatCard
          title="Flags"
          value={loadingLockers ? "…" : `${flaggedLockers}`}
          hint="offline + malfunction"
        />
      </div>

      {/* Real logs section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400 mb-3">Recent Activity</p>

        {loadingLogs && (
          <p className="text-sm text-zinc-500">Loading logs…</p>
        )}

        {!loadingLogs && logs.length === 0 && (
          <p className="text-sm text-zinc-500">
            No logs yet. Actions from the Lockers page will appear here.
          </p>
        )}

        {!loadingLogs && logs.length > 0 && (
          <ul className="space-y-2 text-sm">
            {logs.map((log) => (
              <li
                key={log.id}
                className="border-b border-zinc-800 pb-2 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {log.message ?? "No message"}
                  </span>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {fmtDate(log.createdAt)}
                  </span>
                </div>

                <div className="text-xs text-zinc-400 mt-1">
                  Source: {log.source ?? "unknown"}
                  {log.lockerId ? ` • Locker: ${log.lockerId}` : ""}
                </div>

                <div className="text-xs mt-1">
                  <span
                    className={`px-2 py-0.5 rounded ${logTypeClasses(log.type)}`}
                  >
                    {log.type ?? "event"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}