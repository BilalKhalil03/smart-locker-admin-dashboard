import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

// Admin chrome
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";
import Protected from "@/components/Protected"; // TODO(auth): enforce admin-only later

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Locker Admin",
  description: "Admin dashboard for locker management",
};

/**
 * Layout for ALL routes inside (admin)/:
 * - Adds Topbar + Sidebar
 * - Wraps with Protected (Auth/role checks later)
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Protected>
          <Topbar />
          <Sidebar />
          {/* Main content: pad for fixed bars */}
          <main className="pt-16 pl-60 min-h-screen bg-zinc-950 text-zinc-100">
            <div className="p-6">{children}</div>
          </main>
        </Protected>
      </body>
    </html>
  );
}