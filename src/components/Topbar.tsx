"use client";
import { LogOut } from "lucide-react";

/**
 * Persistent top bar for admin routes.
 * TODO(auth): Call `signOut(auth)` when you wire Firebase.
 */
export default function Topbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center px-6">
      <h1 className="text-lg font-semibold">Smart Locker Admin</h1>

      {/* TODO(auth): Replace with the actual signed-in admin email */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-zinc-400 hidden sm:block">admin@example.com</span>
        <button
          className="p-2 rounded hover:bg-zinc-800"
          title="Sign out"
          // onClick={() => signOut(auth)}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
