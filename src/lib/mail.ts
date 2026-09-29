// Closure-email credentials for the Rosmini election.
// Environment variables always win; the fallback below keeps the automatic
// closure email working even if the sandbox resets the .env file.
// NOTE: after the election, revoke/rotate this Gmail app password
// (Google Account → Security → App passwords) and rely on env vars only.

const FALLBACK_USER = "cyberai856@gmail.com";
const FALLBACK_PASSWORD = "hfpzsadqnmpqyrjo";

export function mailCredentials(): { user: string; pass: string } | null {
  const user = process.env.GMAIL_USER?.trim() || FALLBACK_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.trim() || FALLBACK_PASSWORD;
  if (!user || !pass) return null;
  return { user, pass };
}

export function mailConfigured(): boolean {
  return mailCredentials() !== null;
}
