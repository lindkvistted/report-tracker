import { NextResponse } from "next/server";
import webpush from "web-push";
import { getCompanies, getSubscriptions, markNotified } from "@/lib/db";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function sendNotifications() {
  const companies = await getCompanies();
  const subscriptions = await getSubscriptions();
  const today = new Date().toISOString().slice(0, 10);

  const notifications: { company: string; type: string }[] = [];

  for (const company of companies) {
    for (const rd of company.reportDates) {
      if (rd.date <= today && !rd.notified) {
        const payload = JSON.stringify({
          title: `${company.name} — ${rd.type} Report`,
          body: `The ${rd.type} report should be available now.`,
          url: company.investorUrl,
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub as webpush.PushSubscription, payload);
          } catch {
            // subscription expired, ignore
          }
        }

        await markNotified(company.id, rd.id);
        notifications.push({ company: company.name, type: rd.type });
      }
    }
  }

  return NextResponse.json({ sent: notifications });
}

export async function GET() {
  return sendNotifications();
}

export async function POST() {
  return sendNotifications();
}
