import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";

export interface ReportDate {
  id: string;
  type: "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
  date: string;
  notified: boolean;
}

export interface Company {
  id: string;
  name: string;
  investorUrl: string;
  reportDates: ReportDate[];
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const COMPANIES_KEY = "companies";
const SUBS_KEY = "subscriptions";

async function getAll(): Promise<Company[]> {
  const data = await redis.get<Company[]>(COMPANIES_KEY);
  return data ?? [];
}

async function saveAll(companies: Company[]) {
  await redis.set(COMPANIES_KEY, companies);
}

export async function getCompanies(): Promise<Company[]> {
  return getAll();
}

export async function getCompany(id: string): Promise<Company | undefined> {
  const companies = await getAll();
  return companies.find((c) => c.id === id);
}

export async function addCompany(
  name: string,
  investorUrl: string,
  reportDates: Omit<ReportDate, "id" | "notified">[]
): Promise<Company> {
  const companies = await getAll();
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
  companies.push(company);
  await saveAll(companies);
  return company;
}

export async function updateCompany(
  id: string,
  data: { name?: string; investorUrl?: string; reportDates?: Omit<ReportDate, "id" | "notified">[] }
): Promise<Company | null> {
  const companies = await getAll();
  const idx = companies.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  if (data.name) companies[idx].name = data.name;
  if (data.investorUrl) companies[idx].investorUrl = data.investorUrl;
  if (data.reportDates) {
    companies[idx].reportDates = data.reportDates.map((r) => ({
      ...r,
      id: uuidv4(),
      notified: false,
    }));
  }
  await saveAll(companies);
  return companies[idx];
}

export async function deleteCompany(id: string): Promise<boolean> {
  const companies = await getAll();
  const filtered = companies.filter((c) => c.id !== id);
  if (filtered.length === companies.length) return false;
  await saveAll(filtered);
  return true;
}

export async function getSubscriptions(): Promise<PushSub[]> {
  const data = await redis.get<PushSub[]>(SUBS_KEY);
  return data ?? [];
}

export async function addSubscription(sub: PushSub) {
  const subs = await getSubscriptions();
  const exists = subs.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    await redis.set(SUBS_KEY, subs);
  }
}

export async function markNotified(companyId: string, reportDateId: string) {
  const companies = await getAll();
  const company = companies.find((c) => c.id === companyId);
  if (company) {
    const rd = company.reportDates.find((r) => r.id === reportDateId);
    if (rd) rd.notified = true;
    await saveAll(companies);
  }
}
