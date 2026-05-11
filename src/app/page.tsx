"use client";

import { useEffect, useState, useCallback } from "react";

interface ReportDate {
  id: string;
  type: "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
  date: string;
  notified: boolean;
}

interface Company {
  id: string;
  name: string;
  investorUrl: string;
  reportDates: ReportDate[];
}

const REPORT_TYPES = ["Q1", "Q2", "Q3", "Q4", "Annual"] as const;

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Q1: { bg: "bg-sky-500/10", text: "text-sky-400", dot: "bg-sky-400" },
  Q2: { bg: "bg-violet-500/10", text: "text-violet-400", dot: "bg-violet-400" },
  Q3: { bg: "bg-teal-500/10", text: "text-teal-400", dot: "bg-teal-400" },
  Q4: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400" },
  Annual: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [investorUrl, setInvestorUrl] = useState("");
  const [reportDates, setReportDates] = useState<{ type: string; date: string }[]>([
    { type: "Q1", date: "" },
  ]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    const data = await res.json();
    setCompanies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) setPushEnabled(true);
      });
    }
  }, []);

  async function enablePush() {
    if (!("serviceWorker" in navigator)) return alert("Push not supported on this browser.");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });
    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setPushEnabled(true);
  }

  function resetForm() {
    setName("");
    setInvestorUrl("");
    setReportDates([{ type: "Q1", date: "" }]);
    setEditId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validDates = reportDates.filter((r) => r.date);
    if (editId) {
      await fetch(`/api/companies/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, investorUrl, reportDates: validDates }),
      });
    } else {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, investorUrl, reportDates: validDates }),
      });
    }
    resetForm();
    fetchCompanies();
  }

  function startEdit(c: Company) {
    setEditId(c.id);
    setName(c.name);
    setInvestorUrl(c.investorUrl);
    setReportDates(
      c.reportDates.length > 0
        ? c.reportDates.map((r) => ({ type: r.type, date: r.date }))
        : [{ type: "Q1", date: "" }]
    );
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this company?")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    fetchCompanies();
  }

  function addReportRow() {
    setReportDates([...reportDates, { type: "Q1", date: "" }]);
  }

  function removeReportRow(idx: number) {
    setReportDates(reportDates.filter((_, i) => i !== idx));
  }

  function nextReport(c: Company): ReportDate | null {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = c.reportDates
      .filter((r) => r.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] || null;
  }

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function daysUntil(iso: string) {
    const diff = Math.ceil(
      (new Date(iso + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) /
        86400000
    );
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${diff} days`;
  }

  function urgencyStyle(label: string) {
    if (label === "Overdue") return "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/20";
    if (label === "Today") return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20";
    if (label === "Tomorrow") return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20";
    return "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/15";
  }

  const sorted = [...companies].sort((a, b) => {
    const aNext = nextReport(a)?.date ?? "9999";
    const bNext = nextReport(b)?.date ?? "9999";
    return aNext.localeCompare(bNext);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {/* Push notification banner */}
      {!pushEnabled && (
        <button
          onClick={enablePush}
          className="group w-full flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-200 transition-all hover:ring-amber-500/40"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 text-lg">
            &#x1f514;
          </span>
          <span className="text-left">
            <span className="font-medium text-amber-100">Enable notifications</span>
            <span className="block text-xs text-amber-400/70">Get alerted when reports are due</span>
          </span>
          <svg className="ml-auto h-4 w-4 text-amber-500/50 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      )}

      {/* Empty state */}
      {sorted.length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
            <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Z" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-300">No companies yet</p>
          <p className="mt-1 text-sm text-slate-500">Tap + to start tracking reports</p>
        </div>
      )}

      {/* Company cards */}
      {sorted.map((c) => {
        const next = nextReport(c);
        const typeColor = next ? TYPE_COLORS[next.type] : null;
        return (
          <div
            key={c.id}
            className="group relative rounded-xl bg-slate-800/60 backdrop-blur-sm ring-1 ring-white/[0.06] transition-all hover:ring-white/[0.1]"
          >
            {/* Colored left accent */}
            {typeColor && (
              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${typeColor.dot}`} />
            )}

            <div className="p-4 pl-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-[15px] text-slate-100 truncate">{c.name}</h2>
                  {next ? (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${typeColor!.bg} ${typeColor!.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${typeColor!.dot}`} />
                        {next.type}
                      </span>
                      <span className="text-sm text-slate-400">{formatDate(next.date)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${urgencyStyle(daysUntil(next.date))}`}>
                        {daysUntil(next.date)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mt-1.5">No upcoming reports</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <a
                    href={c.investorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ring-1 ring-indigo-500/20"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                    IR Page
                  </a>
                  <button
                    onClick={() => startEdit(c)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-rose-500/10"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                  </button>
                </div>
              </div>

              {/* Report date chips */}
              {c.reportDates.length > 1 && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-wrap gap-1.5">
                  {c.reportDates
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((r) => {
                      const rc = TYPE_COLORS[r.type];
                      return (
                        <span
                          key={r.id}
                          className={`text-xs px-2 py-0.5 rounded-md ${
                            r.notified
                              ? "bg-slate-700/50 text-slate-600 line-through"
                              : `${rc.bg} ${rc.text}`
                          }`}
                        >
                          {r.type} {formatDate(r.date)}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-xl bg-slate-800/80 backdrop-blur-sm ring-1 ring-indigo-500/30 p-5 space-y-4">
          <h2 className="font-semibold text-base text-slate-100">
            {editId ? "Edit Company" : "Add Company"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Company name</label>
              <input
                type="text"
                placeholder="e.g. Volvo Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-900/70 ring-1 ring-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Investor relations URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={investorUrl}
                onChange={(e) => setInvestorUrl(e.target.value)}
                required
                className="w-full bg-slate-900/70 ring-1 ring-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Report dates</label>
              {reportDates.map((rd, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={rd.type}
                    onChange={(e) => {
                      const copy = [...reportDates];
                      copy[idx].type = e.target.value;
                      setReportDates(copy);
                    }}
                    className="bg-slate-900/70 ring-1 ring-white/[0.08] rounded-lg px-2.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={rd.date}
                    onChange={(e) => {
                      const copy = [...reportDates];
                      copy[idx].date = e.target.value;
                      setReportDates(copy);
                    }}
                    className="flex-1 bg-slate-900/70 ring-1 ring-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  {reportDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReportRow(idx)}
                      className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addReportRow}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Add another date
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                {editId ? "Update" : "Add Company"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg px-4 py-2.5 text-sm transition-colors ring-1 ring-white/[0.06]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-2xl shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:scale-105 active:scale-95"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        </button>
      )}
    </div>
  );
}
