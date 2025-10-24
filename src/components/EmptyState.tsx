/**
 * Generic placeholder used before wiring data.
 * Replace or remove once Firestore queries are added.
 */
export default function EmptyState({
    title = "Not connected",
    subtitle = "Connect Firebase to populate this section.",
    action,
  }: { title?: string; subtitle?: string; action?: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }
  