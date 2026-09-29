"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SchoolLogo from "@/components/SchoolLogo";

type Role = "student" | "admin";
type Tab = "ballot" | "results" | "candidates" | "classes" | "settings";
type Candidate = {
  id: number;
  position: string;
  name: string;
  className: string;
  tagline: string;
  manifesto: string;
  accent: string;
  initials: string;
  imageUrl?: string | null;
};
type Settings = {
  startAt: string;
  endAt: string;
  administrationEmail: string;
  notificationSent: boolean;
  notificationSentAt?: string | null;
};
type ElectionData = {
  settings: Settings;
  candidates: Candidate[];
  totals: Record<string, number>;
  voters?: number;
  voteStudentIds?: string[];
  voteDetails?: Array<{ c: number; s: string; t: string }>;
  positions: string[];
  gmailConfigured?: boolean;
  mail?: { sent: boolean; reason: string };
};

const TOTAL_STUDENTS = 560;

const CLASS_RANGES = [
  { name: "Form 1", from: 1, to: 106 },
  { name: "Form 2", from: 107, to: 212 },
  { name: "Form 3", from: 213, to: 318 },
  { name: "Form 4", from: 319, to: 424 },
  { name: "Form 5", from: 425, to: 530 },
  { name: "Form 6", from: 531, to: 560 },
];

const pad3 = (n: number) => String(n).padStart(3, "0");

const CLASS_COLORS = ["#1b3f94", "#c8102e", "#d9a441", "#2f7d4f", "#7c3aed", "#0f766e"];

function classOfNumber(n: number) {
  return CLASS_RANGES.find((c) => n >= c.from && n <= c.to) ?? null;
}
type Session = { role: Role; identity: string; token?: string };
type Notify = (type: "success" | "error" | "info", message: string) => void;

const CAMPUS_SLIDES = [
  { src: "/school-vote.webp", label: "A student casting a vote" },
  { src: "/school-candidates.webp", label: "Candidates at the election forum" },
  { src: "/school-group.webp", label: "School community assembly" },
  { src: "/school-results.webp", label: "Results day at Rosmini" },
  { src: "/school-building.webp", label: "Main academic block" },
  { src: "/school-classroom.webp", label: "Students in class" },
];

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
  "#c2417a",
];

function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("rosmini-session") ?? window.sessionStorage.getItem("rosmini-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || (parsed.role !== "student" && parsed.role !== "admin") || typeof parsed.identity !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLastStudent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("rosmini-last-student");
    return raw && /^\d{3}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  try {
    const raw = JSON.stringify(session);
    window.localStorage.setItem("rosmini-session", raw);
    window.sessionStorage.setItem("rosmini-session", raw);
  } catch {
    /* storage unavailable */
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem("rosmini-session");
    window.sessionStorage.removeItem("rosmini-session");
  } catch {
    /* storage unavailable */
  }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    users: <><path d="M16 20v-1.4a3.6 3.6 0 0 0-3.6-3.6H7.6A3.6 3.6 0 0 0 4 18.6V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 6.8M20 20v-1.3a3.6 3.6 0 0 0-2.4-3.4" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-5" /></>,
    settings: <><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3H3.3a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-1.3v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 3Z" /></>,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 10.8v5" /><path d="M12 7.7h.01" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    google: <><path d="M21 12.2c0-5-3.9-8.6-8.8-8.6A8.8 8.8 0 1 0 20.8 15h-8.6v-3h5.1a5.3 5.3 0 1 1-5.1-5.4c1.4 0 2.7.5 3.7 1.4l2.1-2.1" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    spark: <><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Z" /><path d="m19 16 .5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16Z" /></>,
    trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M10 11v6M14 11v6" /></>,
    swap: <><path d="m16 3 4 4-4 4" /><path d="M20 7H6" /><path d="m8 21-4-4 4-4" /><path d="M4 17h14" /></>,
    print: <><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></>,
    pencil: <><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.info}</svg>;
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file (JPG or PNG)."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Keep the photo under 8 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The photo could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("The photo could not be processed."));
      img.onload = () => {
        const max = 512;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Photo processing is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function formatTimeLeft(milliseconds: number) {
  if (milliseconds <= 0) return "00d 00h 00m 00s";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function dateTimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function prettyDate(value: string) {
  return new Intl.DateTimeFormat("en-TZ", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusFor(settings?: Settings) {
  if (!settings) return "loading";
  const now = Date.now();
  if (now < new Date(settings.startAt).getTime()) return "upcoming";
  if (now >= new Date(settings.endAt).getTime()) return "closed";
  return "active";
}

function CampusSlideshow() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % CAMPUS_SLIDES.length), 4600);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    [1, 2].forEach((offset) => {
      const pre = new Image();
      pre.src = CAMPUS_SLIDES[(index + offset) % CAMPUS_SLIDES.length].src;
    });
  }, [index]);
  const activeSlide = CAMPUS_SLIDES[index];
  return (
    <>
      <img key={activeSlide.src} className="slide" src={activeSlide.src} alt={activeSlide.label} />
      <div className="slide-dots">
        {CAMPUS_SLIDES.map((slide, slideIndex) => (
          <button key={slide.src} className={slideIndex === index ? "active" : ""} onClick={() => setIndex(slideIndex)} aria-label={`Show photo: ${slide.label}`} />
        ))}
      </div>
    </>
  );
}

function DataLoading() {
  return (
    <div className="data-loading" role="status">
      <SchoolLogo size={44} />
      <p>Connecting to the election room…</p>
      <div className="loading-bar"><span /></div>
    </div>
  );
}

function WelcomeModal({ close }: { close: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <SchoolLogo size={72} />
        <p className="eyebrow">Rosmini Secondary School · Tanga</p>
        <h2 id="welcome-title">Habari ndugu!</h2>
        <p className="welcome-lead">Karibu katika mfumo wa upiga kura wa Rosmini. <em>Welcome to the Rosmini student leadership voting system.</em></p>
        <ul className="welcome-points">
          <li><Icon name="users" size={15} /><span>Kuingia ni rahisi: tumia <strong>namba yako ya msingi (001 – 560)</strong> — hakuna password. <em>Sign in with your student number, no password needed.</em></span></li>
          <li><Icon name="check" size={15} /><span>Upige kura <strong>moja kwa kila nafasi</strong>: Head Boy, Head Girl, na wanafunzi wengine. <em>One vote per position — Head Boy, Head Girl, and other prefects.</em></span></li>
          <li><Icon name="shield" size={15} /><span>Kagua uchaguzi wako kwanza, kisha <strong>thibitisha</strong> kabla ya kutuma. <em>Review your ballot, then confirm before it is submitted.</em></span></li>
          <li><Icon name="clock" size={15} /><span>Kura zinapatikana <strong>kipindi cha rasmi</strong> tu — fuata countdown. <em>Voting is open only inside the official window — watch the countdown.</em></span></li>
        </ul>
        <button className="primary-button welcome-button" onClick={close}>Endelea · Continue <Icon name="arrow" size={16} /></button>
        <p className="welcome-motto">Love to be the Law · Tanga, Tanzania</p>
      </section>
    </div>
  );
}

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loginMode, setLoginMode] = useState<Role>("student");
  const [studentId, setStudentId] = useState(() => readLastStudent() ?? "001");
  const [loginClass, setLoginClass] = useState(() => {
    const last = readLastStudent();
    const c = last ? classOfNumber(Number(last)) : null;
    return c?.name ?? CLASS_RANGES[0].name;
  });
  const [switchOpen, setSwitchOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"all" | "classes" | null>(null);
  const [votedHere, setVotedHere] = useState(false);

  function startPrint(mode: "all" | "classes") {
    setPrintMode(mode);
    window.setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 180);
  }
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [data, setData] = useState<ElectionData | null>(null);
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [tab, setTab] = useState<Tab>("ballot");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submittedPositions, setSubmittedPositions] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [manifesto, setManifesto] = useState<Candidate | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [schedule, setSchedule] = useState({ startAt: "", endAt: "", administrationEmail: "" });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [lastStudent, setLastStudent] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [justVoted, setJustVoted] = useState(false);
  const [pendingPositions, setPendingPositions] = useState<string[]>([]);

  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);

  const dismissWelcome = useCallback(() => {
    try {
      window.sessionStorage.setItem("rosmini-welcome-v1", "1");
    } catch {
      /* storage unavailable */
    }
    setWelcomeOpen(false);
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("rosmini-welcome-v1")) setWelcomeOpen(false);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const fetchElection = useCallback(async () => {
    try {
      const response = await fetch("/api/election", { cache: "no-store" });
      if (!response.ok) throw new Error("Election data is unavailable right now.");
      const nextData = await response.json() as ElectionData;
      setData(nextData);
      setSchedule({ startAt: dateTimeInput(nextData.settings.startAt), endAt: dateTimeInput(nextData.settings.endAt), administrationEmail: nextData.settings.administrationEmail });
      setRemaining(Math.max(0, new Date(nextData.settings.endAt).getTime() - Date.now()));
      return true;
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not load the election." });
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = readStoredSession();
    const valid = stored && !(stored.role === "admin" && !stored.token) ? stored : null;
    if (valid) {
      setSession(valid);
      if (valid.role === "admin") setTab("results");
    }
    const remembered = readLastStudent();
    if (remembered) setLastStudent(remembered);
    try {
      if (window.sessionStorage.getItem("rosmini-voted-here") === "1") setVotedHere(true);
    } catch {
      /* storage unavailable */
    }
    void fetchElection();
  }, [fetchElection]);

  const pollMs = session?.role === "student" && tab === "ballot" ? 5000 : 15000;
  useEffect(() => {
    const refresh = window.setInterval(() => {
      void fetchElection();
    }, pollMs);
    return () => window.clearInterval(refresh);
  }, [fetchElection, pollMs]);

  useEffect(() => {
    if (!data) return;
    const tick = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(data.settings.endAt).getTime() - Date.now()));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [data]);

  useEffect(() => {
    if (!session || session.role !== "student") return;
    fetch(`/api/votes?studentId=${session.identity}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { votes?: Array<{ position: string; candidateId: number }> }) => {
        const submitted = body.votes ?? [];
        setSubmittedPositions(submitted.map((vote) => vote.position));
        setSelections((current) => {
          const next = { ...current };
          submitted.forEach((vote) => { next[vote.position] = vote.candidateId; });
          return next;
        });
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const status = statusFor(data?.settings);
  const totalVotes = useMemo(() => Object.values(data?.totals ?? {}).reduce((sum, value) => sum + value, 0), [data]);
  const selectedCount = Object.keys(selections).filter((position) => !submittedPositions.includes(position)).length;
  const loginRange = CLASS_RANGES.find((c) => c.name === loginClass) ?? CLASS_RANGES[0];

  function tryStudentLogin() {
    const num = Number(studentId);
    if (studentId.length !== 3 || num < loginRange.from || num > loginRange.to) {
      setLoginError(`Namba ${studentId || "…"} si ya ${loginRange.name} (${pad3(loginRange.from)} – ${pad3(loginRange.to)}). Tazama darasa.`);
      return;
    }
    void logIn("student", studentId);
  }

  async function logIn(role: Role, identity: string, password = "") {
    const cleanIdentity = identity.trim().toLowerCase();
    if (role === "student") {
      if (!/^\d{3}$/.test(cleanIdentity) || Number(cleanIdentity) < 1 || Number(cleanIdentity) > 560) {
        setLoginError("Use a student number from 001 through 560.");
        return;
      }
    } else if (!cleanIdentity || !password) {
      setLoginError("Enter both the administrator username and password.");
      return;
    }
    let adminToken: string | undefined;
    if (role === "admin") {
      try {
        const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: cleanIdentity, password }) });
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          setLoginError(body?.error ?? "Administrator authentication failed.");
          return;
        }
        const body = await response.json() as { token?: string };
        adminToken = body.token;
      } catch {
        setLoginError("The administration server could not be reached. Please try again.");
        return;
      }
    }
    const next = { role, identity: role === "student" ? cleanIdentity.padStart(3, "0") : cleanIdentity, token: adminToken } as Session;
    writeSession(next);
    setSession(next);
    setLoginError("");
    setTab(role === "admin" ? "results" : "ballot");
    if (role === "student") {
      try {
        window.localStorage.setItem("rosmini-last-student", next.identity);
      } catch {
        /* storage unavailable */
      }
      setLastStudent(next.identity);
    }
    setToast({ type: "success", message: role === "student" ? `Welcome, student ${next.identity}.` : "Administrator access verified." });
  }

  function logOut() {
    if (session?.role === "student") {
      try {
        window.localStorage.setItem("rosmini-last-student", session.identity);
      } catch {
        /* storage unavailable */
      }
    }
    clearSession();
    setSession(null);
    setSelections({});
    setSubmittedPositions([]);
    setMobileMenu(false);
  }

  function chooseCandidate(position: string, candidateId: number) {
    if (status !== "active" || submittedPositions.includes(position)) return;
    setSelections((current) => ({ ...current, [position]: candidateId }));
  }

  async function submitBallot() {
    if (!session || session.role !== "student") return;
    const newSelections = Object.entries(selections)
      .filter(([position]) => !submittedPositions.includes(position))
      .map(([position, candidateId]) => ({ position, candidateId }));
    if (!newSelections.length) {
      notify("info", "Choose at least one position before reviewing your ballot.");
      return;
    }
    try {
      const response = await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: session.identity, selections: newSelections }) });
      const body = await response.json() as { error?: string; count?: number };
      if (!response.ok) throw new Error(body.error ?? "Your ballot could not be saved.");
      setSubmittedPositions((current) => [...current, ...newSelections.map((selection) => selection.position)]);
      setPendingPositions(newSelections.map((selection) => selection.position));
      setReviewOpen(false);
      setJustVoted(true);
      window.setTimeout(() => setJustVoted(false), 6000);
      notify("success", `Kura yako imehifadhiwa! Karibu mwanafunzi mwingine — namba yake tayari hapa chini.`);
      const refreshed = await fetchElection();
      if (refreshed) setPendingPositions([]);
      const nextNum = Math.min(Number(session.identity) + 1, TOTAL_STUDENTS);
      const nextClass = classOfNumber(nextNum);
      window.setTimeout(() => {
        setStudentId(pad3(nextNum));
        if (nextClass) setLoginClass(nextClass.name);
        try {
          window.localStorage.setItem("rosmini-last-student", session.identity);
          window.sessionStorage.setItem("rosmini-voted-here", "1");
          setLastStudent(session.identity);
          setVotedHere(true);
        } catch {
          /* storage unavailable */
        }
        clearSession();
        setSession(null);
        setSelections({});
        setSubmittedPositions([]);
        setPendingPositions([]);
        setTab("ballot");
      }, 1200);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Your ballot could not be saved.");
    }
  }

  async function saveSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || session.role !== "admin") return;
    setSavingSchedule(true);
    try {
      const response = await fetch("/api/election", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: session.token, startAt: schedule.startAt, endAt: schedule.endAt, administrationEmail: schedule.administrationEmail }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not save the schedule.");
      notify("success", "Election schedule saved. The countdown is live for students.");
      await fetchElection();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not save the schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function closeElection() {
    if (!session || session.role !== "admin") return;
    setSendingNotice(true);
    try {
      const response = await fetch("/api/election", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: session.token }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The closure notice could not be sent.");
      notify("success", "Final results emailed to school administration.");
      await fetchElection();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "The closure notice could not be sent.");
    } finally {
      setSendingNotice(false);
    }
  }

  if (!session) {
    return (
      <main className="login-page">
        <section className="campus-hero" aria-label="Rosmini Secondary School Tanga welcome">
          {votedHere && data ? (
            <div className="hero-live">
              <LiveResultsPanel data={data} selections={{}} submittedPositions={[]} pendingPositions={[]} highlight={false} />
            </div>
          ) : (
            <>
              <CampusSlideshow />
              <div className="hero-wash" />
              <div className="hero-content">
            <div className="hero-brand">
              <SchoolLogo size={80} />
              <div className="brand-copy light">
                <strong>ROSMINI</strong>
                <span>SECONDARY SCHOOL · TANGA</span>
              </div>
            </div>
            <div className="hero-copy">
              <p className="eyebrow light-eyebrow">Love to be the law</p>
              <h1>Choose the<br /><em>leaders</em> who<br />move us forward.</h1>
              <p className="hero-description">A considered voice. A shared future. Welcome to the Rosmini Secondary School student leadership election portal.</p>
            </div>
            <div className="hero-footer"><span>LOVE TO BE THE LAW</span><span className="footer-line" /><span>TANGA · TANZANIA</span></div>
            </div>
            </>
          )}
        </section>
        <section className="login-stage">
          <div className="color-blob blob-blue" aria-hidden="true" /><div className="color-blob blob-gold" aria-hidden="true" /><div className="color-blob blob-red" aria-hidden="true" /><div className="color-blob blob-green" aria-hidden="true" /><div className="color-blob blob-violet" aria-hidden="true" /><div className="color-blob blob-teal" aria-hidden="true" />
          <div className="login-orb orb-one" /><div className="login-orb orb-two" />
          <div className="login-card">
            <div className="login-brand"><SchoolLogo size={64} /><div className="brand-copy center"><strong>ROSMINI</strong><span>SECONDARY SCHOOL · TANGA</span></div></div>
            <div className="login-heading"><p className="eyebrow">Student leadership 2025/26</p><h2>Step into your voice.</h2><p>Sign in to cast your vote for the prefect team.</p></div>
            {loginMode === "student" && lastStudent && (
              <div className="welcome-back">
                <div><strong>Welcome back, Student {lastStudent}</strong><span>Continue where you left off</span></div>
                <button onClick={() => void logIn("student", lastStudent)}>Continue <Icon name="arrow" size={13} /></button>
              </div>
            )}
            <div className="mode-switch" role="tablist" aria-label="Login type">
              <button className={loginMode === "student" ? "active" : ""} onClick={() => { setLoginMode("student"); setLoginError(""); }} role="tab" aria-selected={loginMode === "student"}><Icon name="users" size={16} /> Student</button>
              <button className={loginMode === "admin" ? "active" : ""} onClick={() => { setLoginMode("admin"); setLoginError(""); }} role="tab" aria-selected={loginMode === "admin"}><Icon name="shield" size={16} /> Administration</button>
            </div>
            {loginMode === "student" ? (
              <form onSubmit={(event) => { event.preventDefault(); tryStudentLogin(); }}>
                <label className="field-label" htmlFor="login-class">Darasa yako</label>
                <div className="input-wrap"><select id="login-class" value={loginClass} onChange={(event) => { const name = event.target.value; setLoginClass(name); const r = CLASS_RANGES.find((c) => c.name === name); if (r) setStudentId(pad3(r.from)); setLoginError(""); }}>{CLASS_RANGES.map((c) => <option key={c.name} value={c.name}>{c.name} ({pad3(c.from)} – {pad3(c.to)})</option>)}</select></div>
                <div className="field-gap">
                  <label className="field-label" htmlFor="student-id">Namba yako ya mwanafunzi</label>
                  <div className="input-wrap"><span className="input-prefix">RS</span><input id="student-id" value={studentId} onChange={(event) => { const v = event.target.value.replace(/\D/g, "").slice(0, 3); setStudentId(v); const r = v.length === 3 ? classOfNumber(Number(v)) : null; if (r) setLoginClass(r.name); setLoginError(""); }} inputMode="numeric" placeholder={pad3(loginRange.from)} autoComplete="off" /><span className="input-hint">{pad3(loginRange.from)} – {pad3(loginRange.to)}</span></div>
                </div>
                <p className="field-note"><Icon name="lock" size={14} /> Hakuna password · namba yako ndio utambulisho</p>
                <button className="primary-button login-button" type="submit">Enter the ballot <Icon name="arrow" size={17} /></button>
              </form>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void logIn("admin", adminUsername, adminPassword); }}>
                <label className="field-label" htmlFor="admin-username">Administrator username</label>
                <div className="input-wrap"><span className="input-icon"><Icon name="users" size={17} /></span><input id="admin-username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} placeholder="admin" autoComplete="username" /></div>
                <div className="field-gap">
                  <label className="field-label" htmlFor="admin-password">Password</label>
                  <div className="input-wrap"><span className="input-icon"><Icon name="lock" size={16} /></span><input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="••••••••••••" autoComplete="current-password" /></div>
                </div>
                <p className="field-note"><Icon name="shield" size={14} /> Restricted access · verified privately by the server</p>
                <button className="primary-button login-button" type="submit">Enter the console <Icon name="arrow" size={17} /></button>
              </form>
            )}
            {loginError && <div className="form-error"><Icon name="info" size={15} /> {loginError}</div>}
            <p className="login-legal">{loginMode === "student" ? "By continuing, you agree to use this portal only for the Rosmini Secondary School election in Tanga, Tanzania." : "Access is restricted to the school administrator account. Every console action is verified by the server."}</p>
            <div className="login-status"><span className="status-dot" /> Election room secure <span className="status-divider" /> <Icon name="shield" size={13} /> Encrypted session</div>
          </div>
          <p className="login-credit">Rosmini Secondary School <span>·</span> Tanga, Tanzania</p>
        </section>
        {toast && <div className={`toast ${toast.type}`}><span className="toast-icon"><Icon name={toast.type === "success" ? "check" : toast.type === "error" ? "info" : "clock"} size={16} /></span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
        {welcomeOpen && <WelcomeModal close={dismissWelcome} />}
      </main>
    );
  }

  const isAdmin = session.role === "admin";
  const studentClass = !isAdmin && session ? classOfNumber(Number(session.identity))?.name : null;
  const currentTitle = isAdmin
    ? tab === "settings" ? "Election settings" : tab === "candidates" ? "Candidate registry" : tab === "classes" ? "Uchambuzi wa darasa" : tab === "results" ? "Election overview" : "Administration"
    : tab === "results" ? "The live picture" : "Your ballot";

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Open navigation"><Icon name="menu" /></button>
        <div className="brand-lockup"><SchoolLogo size={34} /><div className="brand-copy"><strong>ROSMINI</strong><span>SECONDARY SCHOOL · TANGA</span></div></div>
        <nav className={`main-nav ${mobileMenu ? "open" : ""}`}>
          <button className={tab === "ballot" ? "active" : ""} onClick={() => { setTab("ballot"); setMobileMenu(false); }}>{isAdmin ? "Overview" : "Ballot"}</button>
          <button className={tab === "results" ? "active" : ""} onClick={() => { setTab("results"); setMobileMenu(false); }}><Icon name="chart" size={15} /> Results</button>
          {isAdmin && (
            <button className={tab === "classes" ? "active" : ""} onClick={() => { setTab("classes"); setMobileMenu(false); }}><Icon name="users" size={15} /> Darasa</button>
          )}
          {isAdmin && (
            <button className={tab === "candidates" ? "active" : ""} onClick={() => { setTab("candidates"); setMobileMenu(false); }}><Icon name="shield" size={15} /> Candidates</button>
          )}
          {isAdmin && <button className={tab === "settings" ? "active" : ""} onClick={() => { setTab("settings"); setMobileMenu(false); }}><Icon name="settings" size={15} /> Settings</button>}
        </nav>
        <div className="topbar-account"><div className={`account-avatar ${isAdmin ? "admin-avatar" : ""}`}>{isAdmin ? "A" : session.identity.slice(-2)}</div><div className="account-copy"><strong>{isAdmin ? "Administrator" : `Student ${session.identity}${studentClass ? ` · ${studentClass}` : ""}`}</strong><span>{isAdmin ? "Full access" : "Voter access"}</span></div><button className="logout-button" onClick={logOut} aria-label="Sign out"><Icon name="logout" size={17} /></button></div>
      </header>
      <div className="app-body">
        <div className="page-heading"><div><p className="eyebrow">{isAdmin ? "Administration console" : "Student leadership election"}</p><h1>{currentTitle}</h1></div><div className={`status-pill ${status}`.trim()}><span className="status-dot" />{status === "active" ? "Voting is open" : status === "upcoming" ? "Voting opens soon" : status === "closed" ? "Voting is closed" : "Election room"}</div></div>
        {!data ? <DataLoading /> : <>
          {tab === "ballot" && !isAdmin && <StudentBallot data={data} status={status} remaining={remaining} selections={selections} submittedPositions={submittedPositions} pendingPositions={pendingPositions} selectedCount={selectedCount} chooseCandidate={chooseCandidate} openManifesto={setManifesto} openReview={() => setReviewOpen(true)} highlight={justVoted} />}
          {tab === "results" && <Results data={data} isAdmin={isAdmin} onRefresh={() => fetchElection()} onPrint={isAdmin ? startPrint : undefined} />}
          {tab === "classes" && isAdmin && <ClassAnalysis data={data} onPrintClasses={() => startPrint("classes")} />}
          {tab === "candidates" && isAdmin && <CandidateManager data={data} token={session.token} notify={notify} refresh={() => fetchElection()} />}
          {tab === "ballot" && isAdmin && <AdminOverview data={data} status={status} totalVotes={totalVotes} goToSettings={() => setTab("settings")} goToResults={() => setTab("results")} goToCandidates={() => setTab("candidates")} />}
          {tab === "settings" && isAdmin && <AdminSettings data={data} schedule={schedule} setSchedule={setSchedule} saveSchedule={saveSchedule} savingSchedule={savingSchedule} closeElection={closeElection} sendingNotice={sendingNotice} />}
        </>}
      </div>
      {manifesto && <ManifestoModal candidate={manifesto} close={() => setManifesto(null)} />}
      {reviewOpen && <ReviewModal data={data} selections={selections} submittedPositions={submittedPositions} close={() => setReviewOpen(false)} submit={submitBallot} />}
      {switchOpen && <SwitchStudentModal close={() => setSwitchOpen(false)} onSwitch={(num) => { setSwitchOpen(false); void logIn("student", num); }} />}
      {printMode && data && <PrintSheets mode={printMode} data={data} />}
      {welcomeOpen && <WelcomeModal close={dismissWelcome} />}
      {toast && <div className={`toast ${toast.type}`}><span className="toast-icon"><Icon name={toast.type === "success" ? "check" : toast.type === "error" ? "info" : "clock"} size={16} /></span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss"><Icon name="close" size={14} /></button></div>}
    </main>
  );
}

function StudentBallot({ data, status, remaining, selections, submittedPositions, pendingPositions, selectedCount, chooseCandidate, openManifesto, openReview, highlight }: {
  data: ElectionData;
  status: string;
  remaining: number;
  selections: Record<string, number>;
  submittedPositions: string[];
  pendingPositions: string[];
  selectedCount: number;
  chooseCandidate: (position: string, candidateId: number) => void;
  openManifesto: (candidate: Candidate) => void;
  openReview: () => void;
  highlight: boolean;
}) {
  const hasCandidates = data.candidates.length > 0;
  return <>
    <section className="countdown-banner"><div className="countdown-intro"><div className="countdown-icon"><Icon name="clock" size={22} /></div><div><span>{status === "active" ? "Time remaining to vote" : status === "upcoming" ? "Voting opens at" : "Voting session ended"}</span><strong>{status === "active" ? formatTimeLeft(remaining) : status === "upcoming" ? prettyDate(data.settings.startAt) : "Final results are being prepared"}</strong></div></div><div className="countdown-meta"><span>Closes {prettyDate(data.settings.endAt)}</span><span className="live-dot" /> Live countdown</div></section>
    {hasCandidates && <div className="switch-row"><button className="switch-pill" onClick={() => document.getElementById("ballot-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Icon name="check" size={17} /><span>Piga kura hapa</span></button></div>}
    <div className="ballot-intro"><div><p className="eyebrow">{data.positions.length > 0 ? `Nafasi ${data.positions.length} · chaguo lako moja` : "Chaguo lako moja"}</p><h2>Chagua kiongozi wako unyemtaka.</h2><p>Chagua mwanashiriki mmoja kwa kila nafasi unayotaka kupiga kura. Utaweza kupanga kura yako kwa makini kabla ya kutuma — hakuna rushwa.</p></div>{data.positions.length > 0 && <div className="ballot-progress"><div className="progress-ring"><strong>{submittedPositions.length + selectedCount}</strong><span>of {data.positions.length}</span></div><div><strong>Ballot progress</strong><span>{submittedPositions.length ? `${submittedPositions.length} position${submittedPositions.length === 1 ? "" : "s"} already recorded` : "Nothing submitted yet"}</span></div></div>}</div>
    {status !== "active" && <div className={`notice-banner ${status}`}><Icon name={status === "closed" ? "lock" : "clock"} size={17} /><div><strong>{status === "closed" ? "Voting is officially closed." : "Voting has not opened yet."}</strong><span>{status === "closed" ? "Your choices can no longer be changed. Visit Results to see the election picture." : `Come back at ${prettyDate(data.settings.startAt)} to cast your ballot.`}</span></div></div>}
    {!hasCandidates ? (
      <>
        <div className="empty-state">
          <Icon name="users" size={26} />
          <h3>The ballot is being prepared.</h3>
          <p>The administration is finalizing the candidate list. Your ballot will appear here as soon as the real candidates are registered.</p>
        </div>
        <LiveResultsPanel data={data} highlight={highlight} selections={selections} submittedPositions={submittedPositions} pendingPositions={pendingPositions} />
      </>
    ) : (
      <div className="ballot-split">
        <div className="ballot-vote-col" id="ballot-section">
          <div className="positions-list">
            {data.positions.map((position, index) => {
              const positionCandidates = data.candidates.filter((candidate) => candidate.position === position);
              const selected = selections[position];
              const submitted = submittedPositions.includes(position);
              return <section className={`position-block ${submitted ? "submitted" : ""}`} key={position}>
                <div className="position-heading"><div className="position-number">0{index + 1}</div><div><h3>{position}</h3><p>{submitted ? "Your choice is securely recorded" : "Choose one candidate"}</p></div><div className={`position-state ${submitted ? "done" : selected ? "chosen" : ""}`}>{submitted ? <><Icon name="check" size={14} /> Recorded</> : selected ? <><Icon name="check" size={14} /> Selected</> : "Open"}</div></div>
                <div className="candidate-grid">
                  {positionCandidates.map((candidate) => <CandidateCard candidate={candidate} selected={selected === candidate.id} disabled={status !== "active" || submitted} openManifesto={openManifesto} choose={() => chooseCandidate(position, candidate.id)} key={candidate.id} />)}
                </div>
              </section>;
            })}
          </div>
          <div className="ballot-submit-bar"><div><Icon name="shield" size={18} /><span><strong>Your vote is private.</strong> Review every selection before submitting.</span></div><button className="primary-button" disabled={status !== "active" || selectedCount === 0} onClick={openReview}>Review my ballot <Icon name="arrow" size={17} /></button></div>
        </div>
        <aside className="ballot-live-col">
          <LiveResultsPanel data={data} highlight={highlight} selections={selections} submittedPositions={submittedPositions} pendingPositions={pendingPositions} />
        </aside>
      </div>
    )}
    <NoticeBoard data={data} />
  </>;
}

function LiveResultsPanel({ data, highlight, selections, submittedPositions, pendingPositions }: {
  data: ElectionData;
  highlight: boolean;
  selections: Record<string, number>;
  submittedPositions: string[];
  pendingPositions: string[];
}) {
  const isPreviewing = (position: string, candidateId: number) =>
    selections[position] === candidateId && (pendingPositions.includes(position) || !submittedPositions.includes(position));
  let previewCount = 0;
  data.positions.forEach((position) => {
    const id = selections[position];
    if (id !== undefined && (pendingPositions.includes(position) || !submittedPositions.includes(position))) previewCount++;
  });
  const totalRecorded = Object.values(data.totals).reduce((sum, value) => sum + value, 0) + previewCount;
  const votedStudents = Math.min(data.voters ?? 0, TOTAL_STUDENTS);
  const notVotedStudents = Math.max(TOTAL_STUDENTS - votedStudents, 0);
  const turnoutPct = Math.round((votedStudents / TOTAL_STUDENTS) * 100);
  return (
    <section id="live-results" className={`live-panel ${highlight ? "flash" : ""}`}>
      <div className="live-panel-head">
        <div>
          <div className="live-badge"><span className="live-pulse" /> LIVE · MOJA KWA MOJA</div>
          <h3>Matokeo ya moja kwa moja</h3>
          {previewCount > 0 && <span className="live-preview-chip">+{previewCount} kura yako — bado haijathibitishwa</span>}
        </div>
        <div className="live-total-card"><strong>{totalRecorded}</strong><span>kura zilizopimwa</span></div>
      </div>
      <div className="turnout-card">
        <div className="turnout-stats">
          <div><strong>{TOTAL_STUDENTS}</strong><span>wanalazimika · required</span></div>
          <div><strong className="ok">{votedStudents}</strong><span>walio piga · voted</span></div>
          <div><strong className="warn">{notVotedStudents}</strong><span>hawaja piga · left</span></div>
        </div>
        <div className="turnout-bar"><span style={{ width: `${Math.max(turnoutPct, 1)}%` }} /></div>
        <div className="turnout-pct"><b>{turnoutPct}%</b><span>ya wanafunzi wamepiga kura — data ya ukweli</span></div>
      </div>
      {data.candidates.length === 0 ? (
        <p className="live-empty">Washiriki bado hawajawekwa kwenye kura · Candidates will appear here as soon as the administration registers them.</p>
      ) : (
        <div className="live-grid">
          {data.positions.map((position) => {
            const rows = data.candidates.filter((c) => c.position === position).map((c) => ({ c, n: (data.totals[c.id] ?? 0) + (isPreviewing(position, c.id) ? 1 : 0) })).sort((a, b) => b.n - a.n);
            const max = Math.max(rows[0]?.n ?? 0, 1);
            const positionTotal = rows.reduce((sum, row) => sum + row.n, 0);
            const leader = positionTotal > 0 ? rows[0] : null;
            return (
              <div className="live-card" key={position} style={{ "--live-accent": leader?.c.accent ?? "#1b3f94" } as React.CSSProperties}>
                <div className="live-card-top"><span>{position}</span>{leader && <em>{leader.c.name} · in the lead</em>}</div>
                {rows.map((row) => (
                  <div className={`live-row ${isPreviewing(position, row.c.id) ? "previewing" : ""}`} key={row.c.id}>
                    <div className="live-row-line">
                      <span className="live-name">{row.c.name}{isPreviewing(position, row.c.id) && <i>kura yako</i>}</span>
                      <b>{row.n}</b>
                    </div>
                    <div className="live-track"><span style={{ width: `${Math.max((row.n / max) * 100, 2)}%` }} /></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CandidateCard({ candidate, selected, disabled, openManifesto, choose }: { candidate: Candidate; selected: boolean; disabled: boolean; openManifesto: (candidate: Candidate) => void; choose: () => void }) {
  return <article className={`candidate-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`} onClick={choose} style={{ "--candidate-accent": candidate.accent } as React.CSSProperties}>
    <div className="candidate-topline"><span className="candidate-label">Candidate</span>{selected && <span className="selected-check"><Icon name="check" size={13} /> Your choice</span>}</div>
    <div className="candidate-profile"><div className="candidate-photo" style={{ background: `linear-gradient(145deg, ${candidate.accent}, #15243e)` }}>{candidate.imageUrl ? <img src={candidate.imageUrl} alt="" /> : <span>{candidate.initials}</span>}</div><div><h4>{candidate.name}</h4><p>{candidate.className}</p></div><span className={`radio ${selected ? "checked" : ""}`} aria-hidden="true"><span /></span></div>
    <p className="candidate-tagline">“{candidate.tagline}”</p>
    <button className="manifesto-link" onClick={(event) => { event.stopPropagation(); openManifesto(candidate); }}>Read their manifesto <Icon name="arrow" size={14} /></button>
  </article>;
}

function ReviewModal({ data, selections, submittedPositions, close, submit }: { data: ElectionData | null; selections: Record<string, number>; submittedPositions: string[]; close: () => void; submit: () => void }) {
  if (!data) return null;
  return <div className="modal-backdrop"><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-top"><div className="modal-icon"><Icon name="shield" size={21} /></div><button className="icon-button" onClick={close} aria-label="Close review"><Icon name="close" /></button></div><p className="eyebrow">One last thoughtful look</p><h2 id="review-title">Review your ballot.</h2><p className="modal-description">Make sure each choice reflects your voice. Once submitted, a choice for a position cannot be changed.</p><div className="review-list">{data.positions.map((position, index) => { const candidate = data.candidates.find((item) => item.id === selections[position]); const recorded = submittedPositions.includes(position); return <div className="review-row" key={position}><span className="review-index">0{index + 1}</span><div><strong>{position}</strong><span>{recorded ? "Already recorded" : candidate ? candidate.name : "No selection — skip this position"}</span></div><span className={recorded ? "review-locked" : candidate ? "review-selected" : "review-skipped"}>{recorded ? <Icon name="lock" size={13} /> : candidate ? <Icon name="check" size={14} /> : "—"}</span></div>; })}</div><div className="review-actions"><button className="secondary-button" onClick={close}>Back to editing</button><button className="primary-button" onClick={submit}>Confirm & submit <Icon name="arrow" size={17} /></button></div><p className="review-footnote"><Icon name="lock" size={13} /> Your ballot is encrypted and linked only to your student number.</p></section></div>;
}

function ManifestoModal({ candidate, close }: { candidate: Candidate; close: () => void }) {
  return <div className="modal-backdrop" onClick={close}><section className="manifesto-modal" onClick={(event) => event.stopPropagation()}><div className="manifesto-cover" style={{ background: `linear-gradient(135deg, ${candidate.accent}, #15243e)` }}><span>{candidate.initials}</span><button className="cover-close" onClick={close} aria-label="Close manifesto"><Icon name="close" /></button></div><div className="manifesto-content"><p className="eyebrow">{candidate.position} · {candidate.className}</p><h2>{candidate.name}</h2><p className="manifesto-quote">“{candidate.tagline}”</p><div className="manifesto-rule" /><h4>My promise to Rosmini</h4><p>{candidate.manifesto}</p><button className="secondary-button" onClick={close}>Return to ballot</button></div></section></div>;
}

function Results({ data, isAdmin, onRefresh, onPrint }: { data: ElectionData; isAdmin: boolean; onRefresh: () => Promise<boolean | void>; onPrint?: (mode: "all" | "classes") => void }) {
  const [presenting, setPresenting] = useState(false);
  const totalRecorded = Object.values(data.totals).reduce((sum, value) => sum + value, 0);
  return <section className="results-page"><div className="results-hero"><div><p className="eyebrow">{isAdmin ? "Live election intelligence" : "A transparent process"}</p><h2>{isAdmin ? "Every voice, clearly counted." : "The live picture."}</h2><p>{isAdmin ? "Monitor participation and candidate momentum as the school makes its choice." : "Results update as votes are securely recorded. Final outcomes are confirmed after the official close."}</p></div><div className="total-votes"><strong>{totalRecorded}</strong><span>votes recorded</span></div></div>{data.candidates.length > 0 && <div className="present-bar"><div><Icon name="chart" size={20} /><div><strong>Project the results on a big screen</strong><span>Perfect for the school assembly — the presentation updates itself while it is open.</span></div></div><button className="primary-button" onClick={() => setPresenting(true)}>Project results <Icon name="arrow" size={16} /></button></div>}{data.candidates.length === 0 ? (
    <div className="empty-state" style={{ marginTop: 17 }}>
      <Icon name="chart" size={26} />
      <h3>No candidates registered yet.</h3>
      <p>Live results will appear here as soon as the administration registers the candidates and students begin voting.</p>
    </div>
  ) : (
    <>
      <div className="results-metrics"><div className="metric-card"><span className="metric-icon blue"><Icon name="users" /></span><strong>{new Set(data.candidates.map((candidate) => candidate.position)).size}</strong><span>positions on the ballot</span></div><div className="metric-card"><span className="metric-icon gold"><Icon name="chart" /></span><strong>{data.candidates.length}</strong><span>candidate profiles</span></div><div className="metric-card"><span className="metric-icon green"><Icon name="shield" /></span><strong>100%</strong><span>ballot integrity</span></div></div>
      <div className="results-grid">{data.positions.map((position) => { const rows = data.candidates.filter((candidate) => candidate.position === position); const max = Math.max(...rows.map((candidate) => data.totals[candidate.id] ?? 0), 1); const positionTotal = rows.reduce((sum, candidate) => sum + (data.totals[candidate.id] ?? 0), 0); return <section className="result-card" key={position}><div className="result-card-heading"><div><span className="result-kicker">Position</span><h3>{position}</h3></div><span>{positionTotal} total</span></div>{rows.map((candidate, index) => { const count = data.totals[candidate.id] ?? 0; const percentage = positionTotal ? Math.round((count / positionTotal) * 100) : 0; return <div className="bar-row" key={candidate.id}><div className="bar-label"><span className="mini-avatar" style={{ background: candidate.accent }}>{candidate.initials.slice(0, 1)}</span><strong>{candidate.name}</strong>{index === 0 && count > 0 && <span className="leader-tag">Leading</span>}<span className="bar-number">{count} <small>({percentage}%)</small></span></div><div className="bar-track"><span style={{ width: `${Math.max(count ? (count / max) * 100 : 3, 3)}%`, background: candidate.accent }} /></div></div>; })}<div className="result-donut-line"><span className="donut" style={{ background: `conic-gradient(${rows[0]?.accent ?? "#1b3f94"} ${positionTotal ? ((data.totals[rows[0]?.id] ?? 0) / positionTotal) * 360 : 0}deg, #edf1f6 0)` }} /><span>Live tally · {statusFor(data.settings) === "closed" ? "Final" : "Provisional"}</span></div></section>; })}</div>
      {isAdmin && <AnalyticsBoard data={data} />}
    </>
  )}{isAdmin && onPrint && data.candidates.length > 0 && (
    <div className="print-actions-row">
      <button className="secondary-button" onClick={() => onPrint("all")}><Icon name="print" size={15} /> Printa matokeo yote (shule nzima)</button>
      <button className="secondary-button" onClick={() => onPrint("classes")}><Icon name="print" size={15} /> Printa matokeo kimadarasa</button>
    </div>
  )}{presenting && <ResultsPresentation data={data} close={() => setPresenting(false)} onRefresh={onRefresh} />}</section>;
}

function ResultsPresentation({ data, close, onRefresh }: { data: ElectionData; close: () => void; onRefresh: () => Promise<boolean | void> }) {
  const status = statusFor(data.settings);
  const totalRecorded = Object.values(data.totals).reduce((sum, value) => sum + value, 0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setInterval(() => {
      void onRefresh();
    }, 10000);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(timer);
    };
  }, [close, onRefresh]);
  return (
    <div className="present-overlay">
      <div className="present-top">
        <div className="present-brand"><SchoolLogo size={38} /><div className="present-brand-copy"><strong>ROSMINI</strong><span>SECONDARY SCHOOL · TANGA</span></div></div>
        <div className={`present-status ${status === "closed" ? "final" : "live"}`}>{status === "closed" ? "Final results" : "Live results"}</div>
        <button className="present-exit" onClick={close}>Exit <Icon name="close" size={14} /></button>
      </div>
      <div className="present-hero-line">
        <h2>Student Leadership Election</h2>
        <p>{status === "closed" ? "Official final tally" : `Voting in progress · closes ${prettyDate(data.settings.endAt)}`} — <strong>{totalRecorded}</strong> vote{totalRecorded === 1 ? "" : "s"} recorded</p>
      </div>
      <div className="present-grid">
        {data.positions.map((position) => {
          const counts = data.candidates.filter((c) => c.position === position).map((c) => ({ c, n: data.totals[c.id] ?? 0 })).sort((a, b) => b.n - a.n);
          const top = counts[0];
          const max = Math.max(top?.n ?? 0, 1);
          if (!top) return null;
          return (
            <section className="present-card" key={position} style={{ "--candidate-accent": top.c.accent } as React.CSSProperties}>
              <span className="present-position">{position}</span>
              <div className="present-winner">
                <div className="present-winner-photo" style={{ background: `linear-gradient(145deg, ${top.c.accent}, #15243e)` }}>{top.c.imageUrl ? <img src={top.c.imageUrl} alt="" /> : <span>{top.c.initials}</span>}</div>
                <div className="present-winner-copy"><strong>{top.c.name}</strong><span>{top.c.className}</span></div>
                <div className="present-number">{top.n}<small>votes</small></div>
              </div>
              <div className="present-bars">
                {counts.map((entry) => (
                  <div className="present-bar" key={entry.c.id}>
                    <span>{entry.c.name}</span>
                    <div className="present-bar-track"><span style={{ width: `${Math.max((entry.n / max) * 100, 2)}%`, background: entry.c.accent }} /></div>
                    <em>{entry.n}</em>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="present-foot">Updates automatically every 10 seconds · {new Date().toLocaleTimeString("en-TZ")} · Love to be the Law</p>
    </div>
  );
}

function NoticeBoard({ data }: { data: ElectionData }) {
  return (
    <div className="notice-board">
      <div className="notice-head"><Icon name="info" size={16} /><div><strong>Important information</strong><span>Read before you vote.</span></div></div>
      <div className="notice-items">
        <div><span>Official window</span><strong>{prettyDate(data.settings.startAt)} → {prettyDate(data.settings.endAt)}</strong></div>
        <div><span>Student accounts</span><strong>001 – 560</strong></div>
        <div><span>Rules</span><strong>One vote per position · final after confirmation</strong></div>
        <div><span>Assistance</span><strong>{data.settings.administrationEmail}</strong></div>
      </div>
    </div>
  );
}

function CandidateManager({ data, token, notify, refresh }: { data: ElectionData; token: string | undefined; notify: Notify; refresh: () => Promise<boolean | void> }) {
  const [form, setForm] = useState({ position: "", name: "", className: "", tagline: "", manifesto: "" });
  const [accent, setAccent] = useState("#1b3f94");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [editing, setEditing] = useState<Candidate | null>(null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      setPhoto(await compressImageFile(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "The photo could not be processed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function addCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, accent, photo, ...form }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The candidate could not be added.");
      notify("success", `${form.name.trim()} is now registered for ${form.position.trim()}.`);
      setForm({ position: "", name: "", className: "", tagline: "", manifesto: "" });
      setPhoto(undefined);
      setPhotoError("");
      await refresh();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "The candidate could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCandidate(id: number) {
    try {
      const response = await fetch("/api/candidates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The candidate could not be removed.");
      notify("success", "Candidate removed from the official ballot.");
      setConfirmDelete(null);
      await refresh();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "The candidate could not be removed.");
    }
  }

  const grouped = data.positions.map((position) => ({ position, list: data.candidates.filter((candidate) => candidate.position === position) }));

  return (
    <section className="candidates-page">
      <div className="candidates-grid">
        <form className="settings-card" onSubmit={addCandidate}>
          <div className="card-heading"><div className="setting-icon"><Icon name="users" /></div><div><h3>Register a candidate</h3><p>Add a confirmed candidate to the official ballot.</p></div></div>
          <div className="form-grid">
            <label><span>Position</span><input list="position-options" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="Head Boy" required /></label>
            <label><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Grace Mwakalinga" required /></label>
            <label><span>Class</span><input value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} placeholder="Form Six · 6A" required /></label>
            <label><span>Campaign line</span><input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} placeholder="A short motto" /></label>
          </div>
          <datalist id="position-options">{data.positions.map((position) => <option key={position} value={position} />)}</datalist>
          <div className="photo-field">
            <span className="field-label">Candidate photo</span>
            <div className={`photo-box ${photo ? "filled" : ""}`}>
              {photo ? <img src={photo} alt="Candidate preview" /> : <Icon name="users" size={24} />}
              <label className="photo-pick">{photoBusy ? "Processing…" : photo ? "Change photo" : "Upload photo"}<input type="file" accept="image/*" hidden onChange={(event) => void pickPhoto(event.target.files?.[0])} disabled={photoBusy} /></label>
              {photo && <button type="button" className="photo-remove" onClick={() => setPhoto(undefined)} aria-label="Remove photo"><Icon name="close" size={13} /></button>}
            </div>
            {photoError ? <p className="photo-error">{photoError}</p> : <p className="photo-hint">Optional · resized automatically to keep the ballot fast</p>}
          </div>
          <label className="full-field"><span>Manifesto</span><textarea rows={4} value={form.manifesto} onChange={(event) => setForm({ ...form, manifesto: event.target.value })} placeholder="What will this candidate do for Rosmini?" /></label>
          <div className="accent-row"><span className="field-label">Ballot color</span>{ACCENTS.map((color) => <button type="button" key={color} className={`swatch ${accent === color ? "selected" : ""}`} style={{ background: color }} onClick={() => setAccent(color)} aria-label={`Select ballot color ${color}`} />)}</div>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? "Registering…" : "Register candidate"} <Icon name="arrow" size={16} /></button>
        </form>
        <div className="settings-card">
          <div className="card-heading"><div className="setting-icon gold"><Icon name="shield" /></div><div><h3>Registered candidates</h3><p>{data.candidates.length === 0 ? "The ballot is currently empty." : `${data.candidates.length} candidate${data.candidates.length === 1 ? "" : "s"} on the official ballot.`}</p></div></div>
          {data.candidates.length === 0 ? (
            <div className="empty-state compact"><Icon name="users" size={22} /><h3>No candidates yet</h3><p>Register the first candidate using the form. It will appear on student ballots immediately.</p></div>
          ) : (
            <div className="candidate-registry">
              {grouped.map(({ position, list }) => (
                <div className="registry-group" key={position}>
                  <span className="registry-position">{position}</span>
                  {list.map((candidate) => (
                    <div className="registry-row" key={candidate.id}>
                      <span className="mini-avatar" style={{ background: candidate.accent }}>{candidate.initials.slice(0, 1)}</span>
                      <div><strong>{candidate.name}</strong><span>{candidate.className}</span></div>
                      {confirmDelete === candidate.id ? (
                        <span className="delete-confirm"><button className="confirm-yes" onClick={() => void removeCandidate(candidate.id)}>Remove</button><button className="confirm-no" onClick={() => setConfirmDelete(null)}>Keep</button></span>
                      ) : (
                        <span className="registry-actions">
                          <button className="edit-btn" onClick={() => setEditing(candidate)} aria-label={`Hariri ${candidate.name}`}><Icon name="pencil" size={14} /></button>
                          <button className="delete-btn" onClick={() => setConfirmDelete(candidate.id)} aria-label={`Remove ${candidate.name}`}><Icon name="trash" size={15} /></button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {editing && <EditCandidateModal candidate={editing} token={token} close={() => setEditing(null)} notify={notify} refresh={refresh} />}
        </div>
      </div>
    </section>
  );
}

function EditCandidateModal({ candidate, token, close, notify, refresh }: { candidate: Candidate; token: string | undefined; close: () => void; notify: Notify; refresh: () => Promise<boolean | void> }) {
  const [form, setForm] = useState({ position: candidate.position, name: candidate.name, className: candidate.className, tagline: candidate.tagline, manifesto: candidate.manifesto });
  const [accent, setAccent] = useState(candidate.accent);
  const [photo, setPhoto] = useState<string | undefined>(candidate.imageUrl ?? undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      setPhoto(await compressImageFile(file));
    } catch (pickError) {
      setPhotoError(pickError instanceof Error ? pickError.message : "The photo could not be processed.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/candidates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id: candidate.id, photo, ...form, accent }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The candidate could not be updated.");
      notify("success", `Taarifa za ${form.name.trim()} zimehifadhiwa.`);
      close();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The candidate could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="switch-modal edit-modal" role="dialog" aria-modal="true" aria-label="Hariri mwanashiriki">
        <div className="modal-top"><div className="modal-icon"><Icon name="pencil" size={19} /></div><button className="icon-button" onClick={close} aria-label="Funga"><Icon name="close" /></button></div>
        <h3>Hariri mwanashiriki</h3>
        <p>Badilisha picha, ballot color, au taarifa yoyote — hata aliyekatisha tayari.</p>
        <form onSubmit={save}>
          <div className="form-grid">
            <label><span>Position</span><input list="edit-position-options" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} required /></label>
            <label><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label><span>Class</span><input value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} required /></label>
            <label><span>Campaign line</span><input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} /></label>
          </div>
          <datalist id="edit-position-options">{[...new Set([...(candidate.position ? [candidate.position] : []), "Head Boy", "Head Girl", "Deputy Head Prefect", "Sports Prefect", "Time & Discipline Prefect"])].map((position) => <option key={position} value={position} />)}</datalist>
          <div className="photo-field">
            <span className="field-label">Picha</span>
            <div className={`photo-box ${photo ? "filled" : ""}`}>
              {photo ? <img src={photo} alt="Candidate preview" /> : <Icon name="users" size={24} />}
              <label className="photo-pick">{photoBusy ? "Processing…" : photo ? "Badilisha picha" : "Pakia picha"}</label>
              <input type="file" accept="image/*" hidden onChange={(event) => void pickPhoto(event.target.files?.[0])} disabled={photoBusy} />
              {photo && <button type="button" className="photo-remove" onClick={() => setPhoto(undefined)} aria-label="Ondoa picha"><Icon name="close" size={13} /></button>}
            </div>
            {photoError ? <p className="photo-error">{photoError}</p> : <p className="photo-hint">Iresizwa na kuchepushwa kwa kiotomatiki</p>}
          </div>
          <label className="full-field"><span>Manifesto</span><textarea rows={4} value={form.manifesto} onChange={(event) => setForm({ ...form, manifesto: event.target.value })} /></label>
          <div className="accent-row"><span className="field-label">Ballot color</span>{ACCENTS.map((color) => <button type="button" key={color} className={`swatch ${accent === color ? "selected" : ""}`} style={{ background: color }} onClick={() => setAccent(color)} aria-label={`Chagua ${color}`} />)}</div>
          {error && <div className="form-error"><Icon name="info" size={15} /> {error}</div>}
          <button className="primary-button switch-submit" type="submit" disabled={saving}>{saving ? "Inahifadhi…" : "Hifadhi mabadiliko"} <Icon name="arrow" size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function DonutChart({ rows }: { rows: { c: Candidate; n: number }[] }) {
  const total = rows.reduce((s, r) => s + r.n, 0);
  const r = 40;
  const c = 55;
  const stroke = 20;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 110 110" width={130} height={130} role="img" aria-label="Donut chart">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#eef1f6" strokeWidth={stroke} />
      {total > 0 &&
        rows
          .filter((row) => row.n > 0)
          .map((row) => {
            const frac = row.n / total;
            const dash = frac * C;
            const el = (
              <circle
                key={row.c.id}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={row.c.accent}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc * C}
                transform={`rotate(-90 ${c} ${c})`}
              />
            );
            acc += frac;
            return el;
          })}
      <text x={c} y={c - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="#10265c" fontFamily="Georgia, serif">
        {total}
      </text>
      <text x={c} y={c + 13} textAnchor="middle" fontSize="7.5" fill="#6b7687" letterSpacing="1.5">
        KURA
      </text>
    </svg>
  );
}

function TrendChart({ details }: { details: Array<{ c: number; s: string; t: string }> }) {
  const times = details.map((d) => new Date(d.t).getTime()).filter((t) => Number.isFinite(t));
  if (times.length < 2) {
    return <p className="analytics-empty">Kura bado hazitoshi kuonyesha mwelekeo — need at least 2 votes to draw the trend line.</p>;
  }
  const minT = Math.min(...times);
  const maxT = Math.max(...times, Date.now());
  const span = maxT - minT;
  const BUCKET = span > 2 * 86400000 ? 6 * 3600000 : span > 6 * 3600000 ? 3600000 : 30 * 60000;
  const points: { t: number; n: number }[] = [];
  let cursor = minT;
  while (cursor < maxT) {
    cursor = Math.min(cursor + BUCKET, maxT);
    points.push({ t: cursor, n: times.reduce((s, v) => s + (v <= cursor ? 1 : 0), 0) });
  }
  if (points.length === 0 || points[points.length - 1].t !== maxT) points.push({ t: maxT, n: times.length });
  else points[points.length - 1].n = times.length;
  const w = 640;
  const h = 190;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const maxN = Math.max(...points.map((p) => p.n), 1);
  const x = (i: number) => padL + (i / Math.max(points.length - 1, 1)) * (w - padL - padR);
  const y = (n: number) => h - padB - (n / maxN) * (h - padT - padB);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.n).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${h - padB} L${padL},${h - padB} Z`;
  const grid = [0, 0.5, 1].map((f) => ({ yy: y(maxN * f), val: Math.round(maxN * f) }));
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  return (
    <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Kura kwa muda">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.yy} x2={w - padR} y2={g.yy} stroke="#e3e8ef" strokeWidth="1" />
          <text x={padL - 7} y={g.yy + 3} textAnchor="end" fontSize="9" fill="#8b96a5">
            {g.val}
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(27,63,148,.1)" />
      <path d={line} fill="none" stroke="#1b3f94" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.n)} r="3" fill="#1b3f94" />
          {i % labelStep === 0 && (
            <text x={x(i)} y={h - padB + 14} textAnchor="middle" fontSize="9" fill="#8b96a5">
              {new Date(p.t).toLocaleTimeString("en-TZ", { hour: "2-digit", minute: "2-digit" })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ClassStack({ data, position }: { data: ElectionData; position: string }) {
  const cands = data.candidates.filter((c) => c.position === position);
  const details = data.voteDetails ?? [];
  const idToClass: Record<string, number> = {};
  CLASS_RANGES.forEach((cls, i) => {
    for (let n = cls.from; n <= cls.to; n += 1) idToClass[pad3(n)] = i;
  });
  const perCandidate = cands.map((c) => {
    const counts = [0, 0, 0, 0, 0, 0];
    details.forEach((d) => {
      if (d.c === c.id) {
        const ci = idToClass[d.s];
        if (ci !== undefined) counts[ci] += 1;
      }
    });
    return { c, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  const posTotal = perCandidate.reduce((s, r) => s + r.total, 0);
  if (perCandidate.length === 0) return null;
  return (
    <div>
      {perCandidate.map((r) => (
        <div className="stack-row" key={r.c.id}>
          <span className="stack-name">{r.c.name}</span>
          <div className="stack-track">
            {r.counts.map((n, i) =>
              n > 0 ? (
                <span key={i} title={`${CLASS_RANGES[i].name}: ${n} kura`} style={{ width: `${(n / Math.max(posTotal, 1)) * 100}%`, background: CLASS_COLORS[i] }} />
              ) : null,
            )}
          </div>
          <em>{r.total}</em>
        </div>
      ))}
    </div>
  );
}

function AnalyticsBoard({ data }: { data: ElectionData }) {
  return (
    <div className="analytics-board">
      <div className="analytics-head">
        <div>
          <p className="eyebrow">Uchambuzi kamili</p>
          <h2>Reprezentesheni za matokeo</h2>
        </div>
        <span className="analytics-note">Donut · Safu · Mwelekeo · Kimadarasa · Tofauti — zote kwa data halisi</span>
      </div>
      <div className="analytics-grid">
        {data.positions.map((position) => {
          const rows = data.candidates.filter((c) => c.position === position).map((c) => ({ c, n: data.totals[c.id] ?? 0 })).sort((a, b) => b.n - a.n);
          const max = Math.max(...rows.map((r) => r.n), 1);
          const gap = rows.length > 1 ? rows[0].n - rows[1].n : rows[0]?.n ?? 0;
          return (
            <section className="analytics-card" key={position}>
              <h3>{position}</h3>
              <div className="analytics-duo">
                <div className="analytics-donut-wrap">
                  <DonutChart rows={rows} />
                  <div className="donut-legend">
                    {rows.map((r) => (
                      <span className="legend-item" key={r.c.id}>
                        <i style={{ background: r.c.accent }} />
                        {r.c.name} <b>{r.n}</b>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-chart">
                  {rows.map((r) => (
                    <div className="col-item" key={r.c.id}>
                      <span className="col-value">{r.n}</span>
                      <div className="col-track"><span style={{ height: `${Math.max((r.n / max) * 100, 2)}%`, background: r.c.accent }} /></div>
                      <span className="col-name">{r.c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              {rows.length > 1 && rows[0].n > 0 && (
                <div className="gap-row"><span>Tofauti ya 1st na 2nd</span><b>{gap} kura</b></div>
              )}
            </section>
          );
        })}
      </div>
      <section className="analytics-card full">
        <h3>Mwelekeo wa kura kwa muda (cumulative)</h3>
        <TrendChart details={data.voteDetails ?? []} />
      </section>
      <section className="analytics-card full">
        <h3>Mchango wa kila darasa — kimwanashiriki</h3>
        {data.positions.map((position) => (
          <div className="stack-block" key={position}>
            <span className="stack-title">{position}</span>
            <ClassStack data={data} position={position} />
          </div>
        ))}
        <div className="class-legend">
          {CLASS_RANGES.map((cls, i) => (
            <span className="legend-item" key={cls.name}>
              <i style={{ background: CLASS_COLORS[i] }} />
              {cls.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminOverview({ data, status, totalVotes, goToSettings, goToResults, goToCandidates }: { data: ElectionData; status: string; totalVotes: number; goToSettings: () => void; goToResults: () => void; goToCandidates: () => void }) {
  return <section className="admin-page"><div className="admin-welcome"><div><span className="admin-badge"><Icon name="shield" size={14} /> Authorized console</span><h2>Good morning, <em>administrator.</em></h2><p>Here is the pulse of the Rosmini Secondary School Tanga leadership election.</p></div><button className="secondary-button" onClick={goToSettings}><Icon name="settings" size={16} /> Manage schedule</button></div><div className="admin-stats"><div><span className="stat-label">Votes recorded</span><strong>{totalVotes}</strong><span className="stat-foot"><span className="green-dot" /> Live from the ballot</span></div><div><span className="stat-label">Election status</span><strong className="status-word">{status === "active" ? "Open" : status === "upcoming" ? "Pending" : "Closed"}</strong><span className="stat-foot">{status === "active" ? `Closes ${prettyDate(data.settings.endAt)}` : status === "closed" ? "Session has ended" : `Starts ${prettyDate(data.settings.startAt)}`}</span></div><div><span className="stat-label">Candidates</span><strong>{data.candidates.length}</strong><span className="stat-foot">On the official ballot</span></div><div><span className="stat-label">Notification</span><strong className={data.settings.notificationSent ? "notified" : "pending-word"}>{data.settings.notificationSent ? "Sent" : "Pending"}</strong><span className="stat-foot">{data.settings.notificationSent ? `At ${prettyDate(data.settings.notificationSentAt ?? data.settings.endAt)}` : "Automatic on official close"}</span></div></div><div className="admin-lower"><div className="admin-callout"><div className="callout-art"><span>R</span><div className="art-star">✦</div></div><div><p className="eyebrow">A considered choice</p><h3>Lead the room,<br />serve the room.</h3><p>Students are choosing leaders who will carry the Rosmini standard forward in Tanga.</p></div></div><div className="quick-actions"><p className="eyebrow">Quick actions</p><button onClick={goToCandidates}><span><Icon name="users" /> Register candidates</span><Icon name="arrow" size={16} /></button><button onClick={goToResults}><span><Icon name="chart" /> View live results</span><Icon name="arrow" size={16} /></button><button onClick={goToSettings}><span><Icon name="clock" /> Update election window</span><Icon name="arrow" size={16} /></button><button onClick={() => window.open("mailto:" + data.settings.administrationEmail)}><span><Icon name="mail" /> Contact administration</span><Icon name="arrow" size={16} /></button></div></div></section>;
}

function AdminSettings({ data, schedule, setSchedule, saveSchedule, savingSchedule, closeElection, sendingNotice }: { data: ElectionData; schedule: { startAt: string; endAt: string; administrationEmail: string }; setSchedule: (value: { startAt: string; endAt: string; administrationEmail: string }) => void; saveSchedule: (event: React.FormEvent<HTMLFormElement>) => void; savingSchedule: boolean; closeElection: () => void; sendingNotice: boolean }) {
  return <section className="settings-page"><div className="settings-intro"><p className="eyebrow">Control room</p><h2>Set the moment.</h2><p>Students can only vote inside this official window. Once it ends, the final tally is automatically sent to the administration inbox.</p></div><div className="settings-grid"><form className="settings-card" onSubmit={saveSchedule}><div className="card-heading"><div className="setting-icon"><Icon name="clock" /></div><div><h3>Election window</h3><p>The official schedule shown to every voter.</p></div></div><div className="form-grid"><label><span>Opens</span><input type="datetime-local" value={schedule.startAt} onChange={(event) => setSchedule({ ...schedule, startAt: event.target.value })} required /></label><label><span>Closes</span><input type="datetime-local" value={schedule.endAt} onChange={(event) => setSchedule({ ...schedule, endAt: event.target.value })} required /></label></div><button className="primary-button" type="submit" disabled={savingSchedule}>{savingSchedule ? "Saving…" : "Save election window"} <Icon name="arrow" size={16} /></button></form><div className="settings-card notification-card"><div className="card-heading"><div className="setting-icon gold"><Icon name="mail" /></div><div><h3>Administration alert</h3><p>Gmail notification after the official close.</p></div></div><label className="full-field"><span>Administration email — zaidi ya moja? toa comma</span><input type="text" value={schedule.administrationEmail} onChange={(event) => setSchedule({ ...schedule, administrationEmail: event.target.value })} placeholder="one@school.tz, two@school.tz" required /></label><div className="gmail-status"><span className={`status-dot ${data.settings.notificationSent ? "sent" : ""}`} /><div><strong>{data.settings.notificationSent ? "Closure email sent" : data.gmailConfigured ? "Automatic email is armed — Gmail connected" : "Automatic email is armed"}</strong><span>{data.settings.notificationSent ? `Imetumwa ${prettyDate(data.settings.notificationSentAt ?? data.settings.endAt)} kwa ${data.settings.administrationEmail}` : data.gmailConfigured ? "Barua itatumwa otomatiki wakati uchaguzi utafungwa" : "Requires GMAIL_USER and GMAIL_APP_PASSWORD on the server"}</span></div></div><button className="secondary-button full-button" type="button" onClick={closeElection} disabled={sendingNotice || new Date(data.settings.endAt) > new Date()}>{sendingNotice ? "Sending…" : new Date(data.settings.endAt) > new Date() ? "Available after official close" : "Send closure notice now"} <Icon name="arrow" size={16} /></button></div></div><div className="security-note"><Icon name="shield" size={18} /><div><strong>Protected administration area</strong><span>Access is restricted to the school administrator account, and every action is verified by the server with a signed session token. The server also enforces the schedule for every submitted ballot.</span></div></div></section>;
}

function SwitchStudentModal({ close, onSwitch }: { close: () => void; onSwitch: (num: string) => void }) {
  const [cls, setCls] = useState(CLASS_RANGES[0].name);
  const [num, setNum] = useState(pad3(CLASS_RANGES[0].from));
  const [error, setError] = useState("");
  const range = CLASS_RANGES.find((c) => c.name === cls) ?? CLASS_RANGES[0];
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const n = Number(num);
    if (num.length !== 3 || n < range.from || n > range.to) {
      setError(`Namba ${num || "…"} si ya ${range.name} (${pad3(range.from)} – ${pad3(range.to)}).`);
      return;
    }
    onSwitch(num);
  }
  return (
    <div className="modal-backdrop">
      <section className="switch-modal" role="dialog" aria-modal="true" aria-label="Badili mwanafunzi">
        <div className="modal-top"><div className="modal-icon"><Icon name="swap" size={20} /></div><button className="icon-button" onClick={close} aria-label="Funga"><Icon name="close" /></button></div>
        <h3>Badili mwanafunzi</h3>
        <p>Chagua darasa na kuingiza namba ya mwanafunzi mwingine — hautahitaji kutoa nje na kuingia upya.</p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="switch-class">Darasa</label>
          <div className="input-wrap"><select id="switch-class" value={cls} onChange={(event) => { const name = event.target.value; setCls(name); const r = CLASS_RANGES.find((c) => c.name === name); if (r) setNum(pad3(r.from)); setError(""); }}>{CLASS_RANGES.map((c) => <option key={c.name} value={c.name}>{c.name} ({pad3(c.from)} – {pad3(c.to)})</option>)}</select></div>
          <div className="field-gap">
            <label className="field-label" htmlFor="switch-num">Namba ya mwanafunzi</label>
            <div className="input-wrap"><span className="input-prefix">RS</span><input id="switch-num" value={num} onChange={(event) => { const v = event.target.value.replace(/\D/g, "").slice(0, 3); setNum(v); const r = v.length === 3 ? classOfNumber(Number(v)) : null; if (r) setCls(r.name); setError(""); }} inputMode="numeric" placeholder={pad3(range.from)} autoComplete="off" /><span className="input-hint">{pad3(range.from)} – {pad3(range.to)}</span></div>
          </div>
          {error && <div className="form-error"><Icon name="info" size={15} /> {error}</div>}
          <button className="primary-button switch-submit" type="submit">Ingia kama Student {num || "…"} <Icon name="arrow" size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function PrintSheets({ mode, data }: { mode: "all" | "classes"; data: ElectionData }) {
  const voteIds = data.voteStudentIds ?? [];
  const details = data.voteDetails ?? [];
  const votedSet = new Set(voteIds);
  const final = statusFor(data.settings) === "closed";
  const pct = Math.round((votedSet.size / TOTAL_STUDENTS) * 100);
  const stamp = new Date().toLocaleString("en-TZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="print-sheet">
      <div className="print-head">
        <SchoolLogo size={56} />
        <div>
          <h1>Rosmini Secondary School — Tanga</h1>
          <h2>{mode === "all" ? "Samali ya Matokeo ya Uchaguzi · Shule Nzima" : "Samali ya Matokeo ya Uchaguzi · Kimadarasa"}</h2>
          <p>{stamp} · {final ? "MATOKEO YA MWISHO" : "Matokeo ya muda wa sasa (PROVISIONAL)"} · Kura zote: {voteIds.length}</p>
        </div>
      </div>
      {mode === "all" ? (
        <>
          <div className="print-block">
            <h3>Mchakato wa kura (turnout)</h3>
            <div className="print-stats">
              <span><b>{TOTAL_STUDENTS}</b>wanafunzi wote</span>
              <span><b>{votedSet.size}</b>walio piga</span>
              <span><b>{Math.max(TOTAL_STUDENTS - votedSet.size, 0)}</b>hawajapiga</span>
              <span><b>{pct}%</b>turnout ya shule</span>
            </div>
          </div>
          {data.positions.map((position) => {
            const rows = data.candidates.filter((c) => c.position === position).map((c) => ({ c, n: data.totals[c.id] ?? 0 })).sort((a, b) => b.n - a.n);
            const total = rows.reduce((s, r) => s + r.n, 0);
            return (
              <div className="print-block" key={position}>
                <h3>{position} — kura {total}</h3>
                <table className="print-table">
                  <thead><tr><th>Mwanashiriki</th><th>Darasa</th><th className="num">Kura</th><th className="num">%</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.c.id} className={i === 0 && r.n > 0 ? "leader" : ""}>
                        <td>{r.c.name}{i === 0 && r.n > 0 ? "  (MKUU)" : ""}</td>
                        <td>{r.c.className}</td>
                        <td className="num">{r.n}</td>
                        <td className="num">{total ? Math.round((r.n / total) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          <div className="print-block">
            <h3>Turnout kimadarasa</h3>
            <table className="print-table">
              <thead><tr><th>Darasa</th><th className="num">Wanaostahili</th><th className="num">Walio piga</th><th className="num">Hawajapiga</th><th className="num">%</th></tr></thead>
              <tbody>
                {CLASS_RANGES.map((cls) => {
                  let v = 0;
                  for (let n = cls.from; n <= cls.to; n += 1) if (votedSet.has(pad3(n))) v += 1;
                  const size = cls.to - cls.from + 1;
                  return <tr key={cls.name}><td>{cls.name} ({pad3(cls.from)} – {pad3(cls.to)})</td><td className="num">{size}</td><td className="num">{v}</td><td className="num">{size - v}</td><td className="num">{Math.round((v / size) * 100)}%</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        CLASS_RANGES.map((cls) => {
          const ids: string[] = [];
          for (let n = cls.from; n <= cls.to; n += 1) ids.push(pad3(n));
          const idSet = new Set(ids);
          const voted = ids.filter((id) => votedSet.has(id)).length;
          const classVotes = details.filter((d) => idSet.has(d.s));
          const byCandidate: Record<number, number> = {};
          classVotes.forEach((d) => {
            byCandidate[d.c] = (byCandidate[d.c] ?? 0) + 1;
          });
          const size = ids.length;
          return (
            <div className="print-block" key={cls.name}>
              <h3>{cls.name} ({pad3(cls.from)} – {pad3(cls.to)})</h3>
              <div className="print-stats">
                <span><b>{size}</b>wanaostahili</span>
                <span><b>{voted}</b>walio piga</span>
                <span><b>{size - voted}</b>hawajapiga</span>
                <span><b>{Math.round((voted / size) * 100)}%</b>turnout</span>
                <span><b>{classVotes.length}</b>kura za darasa</span>
              </div>
              <table className="print-table">
                <thead><tr><th>Position</th><th>Mwanashiriki</th><th className="num">Kura za darasa</th></tr></thead>
                <tbody>
                  {data.candidates.map((c) => (
                    <tr key={c.id}><td>{c.position}</td><td>{c.name}</td><td className="num">{byCandidate[c.id] ?? 0}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
      <p className="print-foot">Rosmini Secondary School Tanga · Election Portal · Samali imeandikwa: {stamp}</p>
    </div>
  );
}

function ClassAnalysis({ data, onPrintClasses }: { data: ElectionData; onPrintClasses: () => void }) {
  const voteIds = data.voteStudentIds ?? [];
  const votedSet = new Set(voteIds);
  const classVoteCounts: Record<string, number> = {};
  voteIds.forEach((id) => {
    const c = classOfNumber(Number(id));
    if (c) classVoteCounts[c.name] = (classVoteCounts[c.name] ?? 0) + 1;
  });
  const votedTotal = votedSet.size;
  const notVotedTotal = Math.max(TOTAL_STUDENTS - votedTotal, 0);
  const schoolPct = Math.round((votedTotal / TOTAL_STUDENTS) * 100);
  return (
    <section className="classes-page">
      <div className="classes-head">
        <div className="classes-head-copy"><p className="eyebrow">Turnout na matokeo</p><h2 className="classes-head-title">Kila darasa kwa nambari zake halisi</h2></div>
        <button className="secondary-button" onClick={onPrintClasses}><Icon name="print" size={15} /> Printa samali kimadarasa</button>
      </div>
      <div className="school-analysis-card">
        <h3>Shule nzima · Rosmini Secondary School Tanga</h3>
        <div className="school-analysis-stats">
          <div><strong>{TOTAL_STUDENTS}</strong><span>wanafunzi wote</span></div>
          <div><strong className="ok">{votedTotal}</strong><span>walio piga kura</span></div>
          <div><strong className="warn">{notVotedTotal}</strong><span>hawaja piga</span></div>
          <div><strong>{voteIds.length}</strong><span>kura zote zilizopimwa</span></div>
          <div><strong>{schoolPct}%</strong><span>turnout ya shule</span></div>
        </div>
        <div className="school-bar"><span style={{ width: `${Math.max(schoolPct, 1)}%` }} /></div>
      </div>
      <div className="class-grid">
        {CLASS_RANGES.map((cls) => {
          const size = cls.to - cls.from + 1;
          const voted: string[] = [];
          const notVoted: string[] = [];
          for (let n = cls.from; n <= cls.to; n += 1) {
            const id = pad3(n);
            (votedSet.has(id) ? voted : notVoted).push(id);
          }
          const pct = Math.round((voted.length / size) * 100);
          return (
            <div className="class-card" key={cls.name}>
              <div className="class-card-head">
                <div><span className="class-name">{cls.name}</span><span className="class-range">{pad3(cls.from)} – {pad3(cls.to)} · wanafunzi {size}</span></div>
                <span className="class-pct">{pct}%</span>
              </div>
              <div className="class-stats">
                <span><b>{size}</b>wanaostahili</span>
                <span className="ok"><b>{voted.length}</b>walio piga</span>
                <span className="warn"><b>{notVoted.length}</b>hawaja piga</span>
                <span><b>{classVoteCounts[cls.name] ?? 0}</b>kura za darasa</span>
              </div>
              <div className="class-bar"><span style={{ width: `${Math.max(pct, 1)}%` }} /></div>
              <div className="class-lists">
                <div><h4>Waliopiga kura ({voted.length})</h4><div className="chip-row">{voted.map((id) => <span className="chip ok" key={id}>{id}</span>)}</div></div>
                <div><h4>Hawajapiga bado ({notVoted.length})</h4><div className="chip-row">{notVoted.map((id) => <span className="chip" key={id}>{id}</span>)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


