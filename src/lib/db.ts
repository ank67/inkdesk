import Dexie, { type Table } from "dexie";

export type DocFormat = "pdf" | "docx" | "pptx" | "epub" | "txt";

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
  textIndex?: string;
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

class ReaderDB extends Dexie {
  docs!: Table<DocRecord, number>;
  annotations!: Table<Annotation, number>;
  bookmarks!: Table<Bookmark, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super("offline-reader");
    this.version(1).stores({
      docs: "++id, title, format, addedAt, lastOpenedAt, archived, *tags",
      annotations: "++id, docId, page, kind",
      bookmarks: "++id, docId, page",
      settings: "key",
    });
  }
}

export const db = new ReaderDB();

const EXT_MAP: Record<string, DocFormat> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  epub: "epub",
  txt: "txt",
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
      textIndex: format === "txt" ? await file.text().catch(() => "") : "",
    });
    added.push(id);
  }
  return added;
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
