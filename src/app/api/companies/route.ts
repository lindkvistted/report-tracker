import { NextResponse } from "next/server";
import { getCompanies, addCompany } from "@/lib/db";

export async function GET() {
  const companies = await getCompanies();
  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const { name, investorUrl, reportDates } = await req.json();
  if (!name || !investorUrl) {
    return NextResponse.json({ error: "name and investorUrl required" }, { status: 400 });
  }
  const company = await addCompany(name, investorUrl, reportDates || []);
  return NextResponse.json(company, { status: 201 });
}
