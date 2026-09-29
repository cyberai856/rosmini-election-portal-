import { and, count, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { candidates, electionSettings, votes } from "@/db/schema";
import { verifyAdminToken } from "@/lib/admin";
import { mailConfigured, mailCredentials } from "@/lib/mail";

export const dynamic = "force-dynamic";

async function ensureElectionData() {
  const existingSettings = await db.select().from(electionSettings).limit(1);
  if (existingSettings.length === 0) {
    const now = Date.now();
    await db.insert(electionSettings).values({
      id: 1,
      schoolName: "Rosmini Secondary School, Tanga",
      startAt: new Date(now - 60 * 60 * 1000),
      endAt: new Date(now + 24 * 60 * 60 * 1000),
      administrationEmail: process.env.ADMINISTRATION_EMAIL ?? "administration@rosmini-tanga.ac.tz",
      notificationSent: false,
    });
  }

}

async function getResults() {
  const totals = await db
    .select({ candidateId: votes.candidateId, total: count(votes.id) })
    .from(votes)
    .groupBy(votes.candidateId);
  return Object.fromEntries(totals.map((result) => [result.candidateId, Number(result.total)]));
}

async function sendClosureEmail() {
  const [settings] = await db.select().from(electionSettings).limit(1);
  if (!settings || settings.notificationSent || new Date(settings.endAt) > new Date()) {
    return { sent: false, reason: settings?.notificationSent ? "already_sent" : "not_closed" };
  }

  const creds = mailCredentials();
  const gmailUser = creds?.user;
  const gmailPassword = creds?.pass;
  if (!gmailUser || !gmailPassword) {
    return { sent: false, reason: "gmail_not_configured" };
  }

  const resultRows = await db
    .select({ position: candidates.position, candidate: candidates.name, total: count(votes.id) })
    .from(candidates)
    .leftJoin(votes, eq(votes.candidateId, candidates.id))
    .groupBy(candidates.id, candidates.position, candidates.name);

  const grouped = resultRows.reduce<Record<string, string[]>>((groups, row) => {
    groups[row.position] ??= [];
    groups[row.position].push(`${row.candidate}: ${Number(row.total)} vote${Number(row.total) === 1 ? "" : "s"}`);
    return groups;
  }, {});
  const plainResults = Object.entries(grouped)
    .map(([position, results]) => `${position}\n${results.join("\n")}`)
    .join("\n\n");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPassword },
  });
  await transporter.sendMail({
    from: `Rosmini Election Portal <${gmailUser}>`,
    to: settings.administrationEmail,
    subject: `Rosmini Secondary School Tanga election closed · ${new Date(settings.endAt).toLocaleDateString("en-TZ")}`,
    text: `The Rosmini Secondary School Tanga voting session officially closed on ${new Date(settings.endAt).toLocaleString("en-TZ")}.\n\nFinal tally:\n\n${plainResults}\n\nThis message was sent automatically by the Rosmini Election Portal.`,
    html: `<div style="font-family:Arial,sans-serif;color:#172033;max-width:640px"><h1 style="color:#1b3f94">Rosmini election closed</h1><p>The Rosmini Secondary School Tanga voting session officially closed on <strong>${new Date(settings.endAt).toLocaleString("en-TZ")}</strong>.</p>${Object.entries(grouped).map(([position, results]) => `<h2>${position}</h2><ul>${results.map((result) => `<li>${result}</li>`).join("")}</ul>`).join("")}<p style="color:#64748b">Sent automatically by the Rosmini Election Portal.</p></div>`,
  });
  await db.update(electionSettings).set({ notificationSent: true, notificationSentAt: new Date(), updatedAt: new Date() }).where(eq(electionSettings.id, 1));
  return { sent: true, reason: "sent" };
}

let closureSendInFlight = false;

function trySendClosureEmail() {
  if (closureSendInFlight) return;
  closureSendInFlight = true;
  void sendClosureEmail().catch(() => undefined).finally(() => {
    closureSendInFlight = false;
  });
}

export async function GET() {
  await ensureElectionData();
  const [settings] = await db.select().from(electionSettings).limit(1);
  const candidateRows = await db.select().from(candidates).orderBy(candidates.id);
  const resultTotals = await getResults();
  const allVotes = await db.select({ s: votes.studentId, c: votes.candidateId, t: votes.createdAt }).from(votes);
  const voteStudentIds = allVotes.map((row) => row.s);
  const voteDetails = allVotes.map((row) => ({ c: row.c, s: row.s, t: new Date(row.t).toISOString() }));
  const uniqueVoters = new Set(voteStudentIds).size;
  // The closure email is fire-and-forget: it must never block or break the data endpoint.
  trySendClosureEmail();

  return NextResponse.json({
    settings,
    candidates: candidateRows,
    totals: resultTotals,
    voters: uniqueVoters,
    voteStudentIds,
    voteDetails,
    gmailConfigured: mailConfigured(),
    mail: { sent: settings?.notificationSent ?? false, reason: settings?.notificationSent ? "sent" : "pending" },
    positions: [...new Set(candidateRows.map((candidate) => candidate.position))],
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; startAt?: string; endAt?: string; administrationEmail?: string };
    if (!verifyAdminToken(body.token)) {
      return NextResponse.json({ error: "Administrator authentication failed. Please sign in again." }, { status: 403 });
    }
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ error: "Choose a valid start and end time." }, { status: 400 });
    }
    await ensureElectionData();
    await db.update(electionSettings).set({
      startAt,
      endAt,
      administrationEmail: body.administrationEmail?.trim() || "administration@rosmini-tanga.ac.tz",
      notificationSent: false,
      notificationSentAt: null,
      updatedAt: new Date(),
    }).where(eq(electionSettings.id, 1));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save the election schedule." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string };
    if (!verifyAdminToken(body.token)) {
      return NextResponse.json({ error: "Administrator authentication failed. Please sign in again." }, { status: 403 });
    }
    await ensureElectionData();
    const [settings] = await db.select().from(electionSettings).limit(1);
    if (!settings || new Date(settings.endAt) > new Date()) {
      return NextResponse.json({ error: "The official end time has not passed yet." }, { status: 400 });
    }
    const mail = await sendClosureEmail();
    if (mail.reason === "gmail_not_configured") {
      return NextResponse.json({ error: "Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to send the notice." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, mail });
  } catch {
    return NextResponse.json({ error: "The closure notice could not be sent." }, { status: 500 });
  }
}
