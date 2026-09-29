import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { candidates, votes } from "@/db/schema";
import { verifyAdminToken } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ACCENTS = [
  "#1b3f94",
  "#c8102e",
  "#d9a441",
  "#2f7d4f",
  "#7c3aed",
  "#0f766e",
  "#be123c",
  "#b45309",
  "#4f46e5",
  "#0369a1",
  "#15803d",
  "#9333ea",
  "#c2417a",
  "#0891b2",
];

function initialsFrom(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "RS"
  );
}

function validatePhoto(photo: string) {
  return photo.startsWith("data:image/") && photo.length <= 1_600_000;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string;
      position?: string;
      name?: string;
      className?: string;
      tagline?: string;
      manifesto?: string;
      accent?: string;
      photo?: string;
    };
    if (!verifyAdminToken(body.token)) {
      return NextResponse.json({ error: "Administrator authentication failed. Please sign in again." }, { status: 403 });
    }
    const photo = body.photo ?? "";
    if (photo && !validatePhoto(photo)) {
      return NextResponse.json({ error: "The candidate photo is too large. Choose a smaller image." }, { status: 400 });
    }
    const position = body.position?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const className = body.className?.trim() ?? "";
    if (!position || !name || !className) {
      return NextResponse.json({ error: "Position, full name, and class are all required." }, { status: 400 });
    }
    if (name.length < 3) {
      return NextResponse.json({ error: "Enter the candidate's full name." }, { status: 400 });
    }
    const tagline = body.tagline?.trim() || name;
    const manifesto =
      body.manifesto?.trim() || "The full manifesto for this candidate will be published by the student leadership office shortly.";
    const accent = ACCENTS.includes(body.accent ?? "") ? (body.accent as string) : ACCENTS[Math.floor(Math.random() * ACCENTS.length)]!;
    const [created] = await db
      .insert(candidates)
      .values({ position, name, className, tagline, manifesto, accent, initials: initialsFrom(name), imageUrl: photo || null })
      .returning({ id: candidates.id });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ error: "The candidate could not be added. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string;
      id?: number;
      position?: string;
      name?: string;
      className?: string;
      tagline?: string;
      manifesto?: string;
      accent?: string;
      photo?: string;
    };
    if (!verifyAdminToken(body.token)) {
      return NextResponse.json({ error: "Administrator authentication failed. Please sign in again." }, { status: 403 });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Choose a valid candidate to update." }, { status: 400 });
    }
    const photo = body.photo ?? "";
    if (photo && !validatePhoto(photo)) {
      return NextResponse.json({ error: "The candidate photo is too large. Choose a smaller image." }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    if (body.position?.trim()) updates.position = body.position.trim();
    if (body.name?.trim()) {
      if (body.name.trim().length < 3) {
        return NextResponse.json({ error: "Enter the candidate's full name." }, { status: 400 });
      }
      updates.name = body.name.trim();
      updates.initials = initialsFrom(body.name.trim());
    }
    if (body.className?.trim()) updates.className = body.className.trim();
    if (body.tagline !== undefined) updates.tagline = body.tagline.trim() || (body.name?.trim() ?? "");
    if (body.manifesto !== undefined) {
      updates.manifesto = body.manifesto.trim() || "The full manifesto for this candidate will be published by the student leadership office shortly.";
    }
    if (body.accent && ACCENTS.includes(body.accent)) updates.accent = body.accent;
    if (body.photo !== undefined) updates.imageUrl = photo || null;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    await db.update(candidates).set(updates).where(eq(candidates.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "The candidate could not be updated. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; id?: number };
    if (!verifyAdminToken(body.token)) {
      return NextResponse.json({ error: "Administrator authentication failed. Please sign in again." }, { status: 403 });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Choose a valid candidate to remove." }, { status: 400 });
    }
    await db.transaction(async (tx) => {
      await tx.delete(votes).where(eq(votes.candidateId, id));
      await tx.delete(candidates).where(eq(candidates.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "The candidate could not be removed. Please try again." }, { status: 500 });
  }
}
