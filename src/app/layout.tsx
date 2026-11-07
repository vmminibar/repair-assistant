import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair Assistant",
  description: "Find safe troubleshooting steps for your appliance, electronics or vehicle, with sources.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="no-print border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Repair Assistant
            </Link>
            <Link href="/troubleshoot" className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Start troubleshooting
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="no-print mx-auto max-w-3xl px-4 pb-10 text-sm text-slate-500">
          Guidance only. Never open sealed or electrical parts, handle refrigerant or gas, or bypass safety
          devices. When unsure, call a qualified technician.
        </footer>
      </body>
    </html>
  );
}
