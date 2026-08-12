import Dexie, { type Table } from "dexie";

export type DocFormat = "pdf" | "docx" | "pptx" | "txt";

export interface TocItem {
  label: string;
  level: number;
  page?: number;
  anchor?: string;
}

export interface DocRecord {
  id?: number;
  title: string;
  format: DocFormat;
  size: number;
  blob: Blob;
  addedAt: number;
  lastOpenedAt?: number;
  page: number;
  pageCount?: number;
  tags: string[];
  archived: 0 | 1;
  starred?: 0 | 1;
  thumb?: string;
  summary?: string[];
  textIndex?: string;
  toc?: TocItem[];
}

export interface TagRecord {
  id?: number;
  name: string;
  color: string;
}

export interface Annotation {
  id?: number;
  docId: number;
  page: number;
  kind: "highlight" | "note" | "drawing";
  text?: string;
  color?: string;
  rects?: { x: number; y: number; w: number; h: number }[];
  path?: string;
  createdAt: number;
}

export interface Bookmark {
  id?: number;
  docId: number;
  page: number;
  label: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** One row per document per day: active seconds actually spent reading. */
export interface ReadingSession {
  id?: number;
  docId: number;
  day: string; // YYYY-MM-DD
  seconds: number;
}

class ReaderDB extends Dexie {
  docs!: Table<DocRecord, number>;
  annotations!: Table<Annotation, number>;
  bookmarks!: Table<Bookmark, number>;
  tags!: Table<TagRecord, number>;
  sessions!: Table<ReadingSession, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super("offline-reader");
    this.version(1).stores({
      docs: "++id, title, format, addedAt, lastOpenedAt, archived, *tags",
      annotations: "++id, docId, page, kind",
      bookmarks: "++id, docId, page",
      settings: "key",
    });
    this.version(2)
      .stores({
        docs: "++id, title, format, addedAt, lastOpenedAt, archived, starred, *tags",
        annotations: "++id, docId, page, kind",
        bookmarks: "++id, docId, page",
        tags: "++id, &name",
        settings: "key",
      })
      .upgrade((tx) =>
        tx
          .table<DocRecord>("docs")
          .toCollection()
          .modify((d) => {
            d.starred = 0;
          }),
      );
    this.version(3).stores({
      sessions: "++id, docId, day, [docId+day]",
    });
  }
}

export const db = new ReaderDB();

export const TAG_COLORS = [
  { id: "primary", label: "Blue", cls: "bg-primary/20 text-primary border-primary/40" },
  { id: "accent", label: "Teal", cls: "bg-accent/20 text-accent border-accent/40" },
  { id: "highlight", label: "Amber", cls: "bg-highlight/20 text-highlight border-highlight/40" },
  { id: "destructive", label: "Red", cls: "bg-destructive/15 text-destructive border-destructive/40" },
] as const;

export function tagColorClass(color: string) {
  return TAG_COLORS.find((c) => c.id === color)?.cls ?? TAG_COLORS[0].cls;
}

const EXT_MAP: Record<string, DocFormat> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  txt: "txt",
  md: "txt",
};

export function detectFormat(name: string): DocFormat | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext] ?? null;
}

export async function addFiles(files: File[]) {
  const added: number[] = [];
  for (const file of files) {
    const format = detectFormat(file.name);
    if (!format) continue;
    const id = await db.docs.add({
      title: file.name.replace(/\.[^.]+$/, ""),
      format,
      size: file.size,
      blob: file,
      addedAt: Date.now(),
      page: 1,
      tags: [],
      archived: 0,
      starred: 0,
      textIndex: format === "txt" ? await file.text().catch(() => "") : "",
    });
    added.push(id);
  }
  return added;
}

export async function addTextDocument(title: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  return db.docs.add({
    title,
    format: "txt",
    size: blob.size,
    blob,
    addedAt: Date.now(),
    page: 1,
    tags: [],
    archived: 0,
    starred: 0,
    textIndex: text,
  });
}

export async function deleteDoc(id: number) {
  await db.transaction("rw", db.docs, db.annotations, db.bookmarks, async () => {
    await db.docs.delete(id);
    await db.annotations.where("docId").equals(id).delete();
    await db.bookmarks.where("docId").equals(id).delete();
  });
}

export async function toggleArchive(id: number) {
  const doc = await db.docs.get(id);
  if (!doc) return;
  await db.docs.update(id, { archived: doc.archived ? 0 : 1 });
}

export async function toggleStar(id: number) {
  const doc = await db.docs.get(id);
  if (!doc) return;
  await db.docs.update(id, { starred: doc.starred ? 0 : 1 });
}

export async function setDocTags(id: number, tags: string[]) {
  await db.docs.update(id, { tags });
}

export async function saveThumb(id: number, thumb: string) {
  await db.docs.update(id, { thumb });
}

export async function saveSummary(id: number, summary: string[]) {
  await db.docs.update(id, { summary });
}

export async function getStorageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, supported: false as const };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota, supported: true as const };
}

export async function clearCaches() {
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Keeps the extension and version suffix visible: "Super_Pro…v2.pdf". */
export function middleTruncate(value: string, max = 26) {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}

export function readingProgress(doc: DocRecord) {
  if (!doc.pageCount || doc.pageCount < 2) return doc.lastOpenedAt ? 100 : 0;
  return Math.min(100, Math.round(((doc.page || 1) / doc.pageCount) * 100));
}
