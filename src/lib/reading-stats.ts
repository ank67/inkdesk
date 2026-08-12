import { db } from "@/lib/db";

/** Reader levels, unlocked purely by active reading minutes. */
export const READER_LEVELS = [
  { level: 1, name: "Curious Skimmer", minMinutes: 0 },
  { level: 2, name: "Casual Reader", minMinutes: 30 },
  { level: 3, name: "Page Turner", minMinutes: 120 },
  { level: 4, name: "Deep Diver", minMinutes: 360 },
  { level: 5, name: "Bookworm", minMinutes: 900 },
  { level: 6, name: "Scholar", minMinutes: 1800 },
  { level: 7, name: "Librarian", minMinutes: 3600 },
] as const;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Adds active reading seconds for a document on the current day.
 * Only called by the reader while the page is visible and the user is present,
 * so sign-in time and idle scrolling never inflate the totals.
 */
export async function addReadingTime(docId: number, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const day = today();
  const existing = await db.sessions.where({ docId, day }).first();
  if (existing?.id) {
    await db.sessions.update(existing.id, { seconds: existing.seconds + Math.round(seconds) });
    return;
  }
  await db.sessions.add({ docId, day, seconds: Math.round(seconds) });
}

export function levelFor(totalMinutes: number) {
  let current = READER_LEVELS[0];
  for (const l of READER_LEVELS) if (totalMinutes >= l.minMinutes) current = l;
  const next = READER_LEVELS.find((l) => l.minMinutes > totalMinutes);
  const span = (next?.minMinutes ?? current.minMinutes) - current.minMinutes;
  const progress = next && span > 0 ? Math.min(100, Math.round(((totalMinutes - current.minMinutes) / span) * 100)) : 100;
  return { current, next: next ?? null, progress };
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export async function readingSummary() {
  const [sessions, docs] = await Promise.all([db.sessions.toArray(), db.docs.toArray()]);
  const totalSeconds = sessions.reduce((s, r) => s + r.seconds, 0);
  const day = today();
  const todaySeconds = sessions.filter((s) => s.day === day).reduce((s, r) => s + r.seconds, 0);

  const week: { day: string; seconds: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    week.push({ day: d, seconds: sessions.filter((s) => s.day === d).reduce((a, r) => a + r.seconds, 0) });
  }

  const byDoc = new Map<number, number>();
  sessions.forEach((s) => byDoc.set(s.docId, (byDoc.get(s.docId) ?? 0) + s.seconds));
  const top = [...byDoc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([docId, seconds]) => ({
      title: docs.find((d) => d.id === docId)?.title ?? "Removed document",
      seconds,
    }));

  const activeDays = new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.day)).size;

  return {
    totalSeconds,
    todaySeconds,
    week,
    top,
    activeDays,
    ...levelFor(totalSeconds / 60),
  };
}
