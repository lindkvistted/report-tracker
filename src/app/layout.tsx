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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="1" width="18" height="22" rx="2" opacity="0.4"/>
                <rect x="7" y="13" width="2.5" height="6" rx="1" fill="#7dd3fc" stroke="none"/>
                <rect x="10.75" y="10" width="2.5" height="9" rx="1" fill="#c4b5fd" stroke="none"/>
                <rect x="14.5" y="11.5" width="2.5" height="7.5" rx="1" fill="#5eead4" stroke="none"/>
                <polyline points="8,12 12,8.5 16,10" stroke="white" strokeWidth="1.5" opacity="0.9"/>
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Report Tracker</h1>
          </div>
        </header>
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
