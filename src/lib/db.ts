import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface ReportDate {
  id: string;
  type: "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
  date: string; // ISO date string YYYY-MM-DD
  notified: boolean;
}

export interface Company {
  id: string;
  name: string;
  investorUrl: string;
  reportDates: ReportDate[];
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface DB {
  companies: Company[];
  subscriptions: PushSubscription[];
}

const DB_PATH = path.join(process.cwd(), "data.json");

function read(): DB {
  if (!fs.existsSync(DB_PATH)) {
    return { companies: [], subscriptions: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function write(db: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function getCompanies(): Company[] {
  return read().companies;
}

export function getCompany(id: string): Company | undefined {
  return read().companies.find((c) => c.id === id);
}

export function addCompany(
  name: string,
  investorUrl: string,
  reportDates: Omit<ReportDate, "id" | "notified">[]
): Company {
  const db = read();
  const company: Company = {
    id: uuidv4(),
    name,
    investorUrl,
    reportDates: reportDates.map((r) => ({
      ...r,
      id: uuidv4(),
      notified: false,
    })),
  };
  db.companies.push(company);
  write(db);
  return company;
}

export function updateCompany(
  id: string,
  data: { name?: string; investorUrl?: string; reportDates?: Omit<ReportDate, "id" | "notified">[] }
): Company | null {
  const db = read();
  const idx = db.companies.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  if (data.name) db.companies[idx].name = data.name;
  if (data.investorUrl) db.companies[idx].investorUrl = data.investorUrl;
  if (data.reportDates) {
    db.companies[idx].reportDates = data.reportDates.map((r) => ({
      ...r,
      id: uuidv4(),
      notified: false,
    }));
  }
  write(db);
  return db.companies[idx];
}

export function deleteCompany(id: string): boolean {
  const db = read();
  const before = db.companies.length;
  db.companies = db.companies.filter((c) => c.id !== id);
  write(db);
  return db.companies.length < before;
}

export function getSubscriptions(): PushSubscription[] {
  return read().subscriptions;
}

export function addSubscription(sub: PushSubscription) {
  const db = read();
  const exists = db.subscriptions.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    db.subscriptions.push(sub);
    write(db);
  }
}

export function markNotified(companyId: string, reportDateId: string) {
  const db = read();
  const company = db.companies.find((c) => c.id === companyId);
  if (company) {
    const rd = company.reportDates.find((r) => r.id === reportDateId);
    if (rd) rd.notified = true;
    write(db);
  }
}
