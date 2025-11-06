/**
 * list for "Most-used lockers"
 * later: pass real data from Firestore aggregation
 */
export default function UsageList({
  items,
}: {
  items: Array<{ lockerId: string; count: number; location?: string }>;
}) {
  if (!items || items.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        No usage data yet. After Firestore is added, pass top 5 lockers here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.lockerId}
          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">{item.lockerId}</p>
            {item.location && (
              <p className="text-xs text-zinc-500">{item.location}</p>
            )}
          </div>
          <p className="text-sm text-zinc-200">{item.count} uses</p>
        </li>
      ))}
    </ul>
  );
}
