import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Report Tracker",
  description: "Track quarterly and annual report releases",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-100 font-[family-name:var(--font-geist-sans)]">
        <header className="relative overflow-hidden px-5 py-4 text-white shadow-lg shadow-indigo-950/40">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(129,140,248,0.2),transparent_60%)]" />
          <div className="relative flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-sm font-bold">
              R
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Report Tracker</h1>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
