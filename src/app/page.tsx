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

  const sorted = [...companies].sort((a, b) => {
    const aNext = nextReport(a)?.date ?? "9999";
    const bNext = nextReport(b)?.date ?? "9999";
    return aNext.localeCompare(bNext);
  });

  if (loading) {
    return <p className="text-center py-12 text-slate-400">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Push notification toggle */}
      {!pushEnabled && (
        <button
          onClick={enablePush}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Enable push notifications
        </button>
      )}

      {/* Company list */}
      {sorted.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-2">No companies added yet</p>
          <p className="text-sm">Tap the + button to add your first company</p>
        </div>
      )}

      {sorted.map((c) => {
        const next = nextReport(c);
        return (
          <div
            key={c.id}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">{c.name}</h2>
                {next ? (
                  <p className="text-sm text-slate-400 mt-1">
                    <span className="text-blue-400 font-medium">{next.type}</span>
                    {" — "}
                    {formatDate(next.date)}
                    <span
                      className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        daysUntil(next.date) === "Overdue"
                          ? "bg-red-900 text-red-300"
                          : daysUntil(next.date) === "Today"
                          ? "bg-green-900 text-green-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {daysUntil(next.date)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">No upcoming reports</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={c.investorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  IR Page
                </a>
                <button
                  onClick={() => startEdit(c)}
                  className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="bg-slate-700 hover:bg-red-700 text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Del
                </button>
              </div>
            </div>

            {/* All report dates */}
            {c.reportDates.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.reportDates
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((r) => (
                    <span
                      key={r.id}
                      className={`text-xs px-2 py-1 rounded ${
                        r.notified
                          ? "bg-slate-700 text-slate-500 line-through"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {r.type} {formatDate(r.date)}
                    </span>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-4 border border-blue-600 space-y-3">
          <h2 className="font-semibold">
            {editId ? "Edit Company" : "Add Company"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="url"
              placeholder="Investor relations URL"
              value={investorUrl}
              onChange={(e) => setInvestorUrl(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Report dates</label>
              {reportDates.map((rd, idx) => (
                <div key={idx} className="flex gap-2">
                  <select
                    value={rd.type}
                    onChange={(e) => {
                      const copy = [...reportDates];
                      copy[idx].type = e.target.value;
                      setReportDates(copy);
                    }}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-sm"
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
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  />
                  {reportDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReportRow(idx)}
                      className="text-red-400 hover:text-red-300 px-2"
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addReportRow}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                + Add another date
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                {editId ? "Update" : "Add Company"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2.5 text-sm transition-colors"
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-2xl shadow-xl transition-colors flex items-center justify-center"
        >
          +
        </button>
      )}
    </div>
  );
}
