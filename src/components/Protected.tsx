"use client";
import { ReactNode } from "react";

/**
 * Route guard placeholder:
 * Renders children now; later enforce admin-only with Firebase Auth.
 *
 * TODO(auth):
 *  - Use useAuthState(auth) or an auth context to get the user
 *  - If not logged in or lacks admin role → redirect("/login")
 *    (via `useRouter()` from next/navigation)
 */
export default function Protected({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
