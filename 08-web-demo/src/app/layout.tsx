import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KiKi-Pi-One — 16-bit CPU Simulator",
  description: "Interactive hardware simulator for the KiKi-Pi-One 16-bit CPU project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f1117] text-slate-200">
        <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-6 text-sm">
          <a href="/" className="font-bold text-emerald-400 hover:text-emerald-300">
            KiKi-Pi-One
          </a>
          <a href="/registers" className="text-slate-400 hover:text-slate-200">Registers</a>
          <a href="/alu" className="text-slate-400 hover:text-slate-200">ALU</a>
          <a href="/memory" className="text-slate-400 hover:text-slate-200">Memory</a>
          <a
            href="https://github.com/SreejitS/KiKi-Pi-One"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-slate-500 hover:text-slate-300"
          >
            GitHub ↗
          </a>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
