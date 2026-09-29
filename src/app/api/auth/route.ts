import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, verifyAdminCredentials } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    if (!verifyAdminCredentials(body.username, body.password)) {
      return NextResponse.json({ error: "Incorrect administrator username or password." }, { status: 401 });
    }
    const username = body.username!.trim().toLowerCase();
    return NextResponse.json({ ok: true, identity: username, token: createAdminToken(username) });
  } catch {
    return NextResponse.json({ error: "Could not verify the administrator account. Please try again." }, { status: 400 });
  }
}
