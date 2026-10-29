import { NextRequest, NextResponse } from "next/server";
import { sendRiskAlertEmail } from "@/lib/alert-email";

// Permite enviar los avisos aunque nadie tenga la app abierta: programa un cron
// (Vercel Cron, cron-job.org, etc.) que haga GET con  Authorization: Bearer <CRON_SECRET>.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sendRiskAlertEmail());
}
