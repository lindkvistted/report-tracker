import type { Metadata } from "next";
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
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
        <header className="bg-blue-600 px-4 py-3 text-white shadow-lg">
          <h1 className="text-lg font-semibold">Report Tracker</h1>
        </header>
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
