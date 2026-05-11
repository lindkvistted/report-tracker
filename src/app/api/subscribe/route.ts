import { NextResponse } from "next/server";
import { addSubscription } from "@/lib/db";

export async function POST(req: Request) {
  const sub = await req.json();
  await addSubscription(sub);
  return NextResponse.json({ ok: true });
}
