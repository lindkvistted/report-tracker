import { NextResponse } from "next/server";
import { getCompany, updateCompany, deleteCompany } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = getCompany(id);
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const company = updateCompany(id, data);
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteCompany(id);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
