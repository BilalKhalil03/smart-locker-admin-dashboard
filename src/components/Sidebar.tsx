"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, DollarSign, Gauge } from "lucide-react";

/**
 * Left navigation for admin pages.
 * Uses App Router paths; (admin) is a route group so it doesn't affect the URL.
 */
const items = [
  { href: "/",          label: "Dashboard", icon: Gauge },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/lockers",   label: "Lockers",   icon: Boxes },
  { href: "/pricing",   label: "Pricing",   icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed top-16 left-0 bottom-0 w-60 border-r border-zinc-800 bg-zinc-950/50">
      <nav className="p-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded text-sm",
                active ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-900",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
