"use client";

/**
 * Admin Login (placeholder)
 * TODO(auth):
 *  - Add Firebase Auth (Email/Password or Google)
 *  - On success: `router.replace("/")`
 *  - Protect admin routes with role check (custom claims or allowlist)
 */
export default function Login() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 w-[360px]">
        <h2 className="text-lg font-semibold mb-3">Admin Login</h2>

        {/* Replace with a real form and Firebase sign-in */}
        <div className="space-y-2 text-sm">
          <div className="text-zinc-400">
            TODO: Implement Firebase Auth and redirect to the dashboard on success.
          </div>
          <div className="text-zinc-500">
            Later: hide sidebar/topbar on this route (already done by layout grouping).
          </div>
        </div>
      </div>
    </div>
  );
}
