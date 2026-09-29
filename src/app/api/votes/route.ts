import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, electionSettings, votes } from "@/db/schema";

export const dynamic = "force-dynamic";

function validStudentId(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{3}$/.test(value)) return false;
  const number = Number(value);
  return number >= 1 && number <= 560;
}

export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  if (!validStudentId(studentId)) {
    return NextResponse.json({ error: "Enter a student number from 001 to 560." }, { status: 400 });
  }
  const studentVotes = await db.select().from(votes).where(eq(votes.studentId, studentId));
  return NextResponse.json({ votes: studentVotes });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      studentId?: string;
      selections?: Array<{ position?: string; candidateId?: number }>;
    };
    if (!validStudentId(body.studentId)) {
      return NextResponse.json({ error: "Enter a student number from 001 to 560." }, { status: 400 });
    }
    const selections = body.selections ?? [];
    if (!selections.length) {
      return NextResponse.json({ error: "Choose one candidate for at least one position." }, { status: 400 });
    }
    const normalized = selections.map((selection) => ({
      position: selection.position?.trim() ?? "",
      candidateId: Number(selection.candidateId),
    }));
    if (normalized.some((selection) => !selection.position || !Number.isInteger(selection.candidateId))) {
      return NextResponse.json({ error: "Each choice must include a valid position and candidate." }, { status: 400 });
    }
    if (new Set(normalized.map((selection) => selection.position)).size !== normalized.length) {
      return NextResponse.json({ error: "Choose only one candidate per position." }, { status: 400 });
    }

    const inserted = await db.transaction(async (tx) => {
      const [settings] = await tx.select().from(electionSettings).limit(1);
      if (!settings) throw new Error("Election settings are not ready.");
      const now = new Date();
      if (now < new Date(settings.startAt) || now >= new Date(settings.endAt)) {
        throw new Error("Voting is not currently open.");
      }

      const existing = await tx.select({ position: votes.position }).from(votes).where(
        and(eq(votes.studentId, body.studentId as string), inArray(votes.position, normalized.map((selection) => selection.position))),
      );
      if (existing.length) {
        throw new Error(`You already voted for ${existing.map((vote) => vote.position).join(", ")}.`);
      }

      const candidateRows = await tx.select({ id: candidates.id, position: candidates.position }).from(candidates).where(
        inArray(candidates.id, normalized.map((selection) => selection.candidateId)),
      );
      if (candidateRows.length !== normalized.length || normalized.some((selection) => {
        const candidate = candidateRows.find((row) => row.id === selection.candidateId);
        return !candidate || candidate.position !== selection.position;
      })) {
        throw new Error("One or more candidate choices are no longer available.");
      }
      return tx.insert(votes).values(normalized.map((selection) => ({
        studentId: body.studentId as string,
        candidateId: selection.candidateId,
        position: selection.position,
      }))).returning({ id: votes.id });
    });

    return NextResponse.json({ ok: true, count: inserted.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your ballot could not be saved.";
    const status = message.includes("already voted") || message.includes("not currently") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
