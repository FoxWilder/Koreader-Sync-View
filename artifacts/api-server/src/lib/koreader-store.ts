import fs from "fs";
import path from "path";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BookCard {
  md5: string;
  name: string;
  display_title: string;
  display_author: string;
  path: string | null;
  ext: string;
  folder: string;
  size_human: string;
  mtime_iso: string;
  has_cover: boolean;
  last_progress: number;
  last_read_iso: string;
  last_user: string;
  last_device: string;
  last_ts: number;
  epub_has_meta: boolean;
  epub_title: string;
  epub_authors: string[];
  epub_publisher: string;
  epub_language: string;
  epub_date: string;
  epub_series: string;
  epub_series_index: string;
  epub_subjects: string[];
  epub_identifiers: string[];
  epub_description: string;
}

export interface UserStat {
  user: string;
  books: number;
  last_ts: number;
  last_iso: string;
  devices: string[];
}

export interface SyncRecord {
  document: string;
  progress: string;
  percentage: number;
  device: string;
  device_id: string;
  timestamp: number;
}

export interface StatsResponse {
  active_books: number;
  completed: number;
  in_progress: number;
  not_started: number;
  avg_progress: number;
  users: number;
  last_activity_iso: string;
  last_activity_age: string;
  days_active_last14: number;
  top_recent: BookCard[];
  users_breakdown: UserStat[];
}

// ---------------------------------------------------------------------------
// Persistence paths
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.KOREADER_DATA_DIR || path.join(process.cwd(), "koreader-data");
const USERS_DIR = path.join(DATA_DIR, "users");
const COVERS_DIR = path.join(DATA_DIR, "covers");
const CACHE_FILE = process.env.KOREADER_CACHE || path.join(DATA_DIR, "book-md5-cache.json");

fs.mkdirSync(USERS_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HEX32 = /^[0-9a-fA-F]{32}$/;

function isoTs(ts: number): string {
  try {
    const t = ts > 1e12 ? ts / 1000 : ts;
    return new Date(t * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return "";
  }
}

function humanAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function humanBytes(n: number): string {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = n;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return i > 0 ? `${size.toFixed(1)} ${units[i]}` : `${Math.floor(size)} ${units[i]}`;
}

function safeReadJson(filePath: string): unknown {
  for (const enc of (["utf-8", "utf-8-sig", "utf-16"] as BufferEncoding[])) {
    try {
      return JSON.parse(fs.readFileSync(filePath, enc));
    } catch {
      // try next
    }
  }
  return null;
}

function safeWriteJson(filePath: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

// ---------------------------------------------------------------------------
// Library index
// ---------------------------------------------------------------------------
let INDEX: Record<string, string> = {};
let LIB: Array<{ md5: string; name: string; path: string }> = [];

function loadCache(): void {
  try {
    const raw = safeReadJson(CACHE_FILE) as Record<string, string> | null;
    if (raw && typeof raw === "object") {
      INDEX = raw;
      LIB = Object.entries(raw).map(([md5, fullpath]) => ({
        md5,
        name: path.basename(fullpath),
        path: fullpath,
      }));
      logger.info({ count: LIB.length }, "Library cache loaded");
    }
  } catch {
    logger.warn("Could not load book-md5-cache.json, library will be empty");
  }
}

loadCache();

// ---------------------------------------------------------------------------
// Covers (stored as base64 data URLs in .txt files)
// ---------------------------------------------------------------------------
function coverTxtPath(md5: string): string | null {
  const p = path.join(COVERS_DIR, md5 + ".txt");
  return fs.existsSync(p) ? p : null;
}

export function hasCover(md5: string): boolean {
  return coverTxtPath(md5) !== null;
}

export function readCoverBytes(md5: string): { mime: string; data: Buffer } | null {
  const p = coverTxtPath(md5);
  if (!p) return null;
  try {
    const raw = fs.readFileSync(p, "utf-8").trim();
    if (!raw.toLowerCase().startsWith("data:")) return null;
    const comma = raw.indexOf(",");
    if (comma < 0) return null;
    const header = raw.slice(5, comma);
    const parts = header.split(";");
    const mime = parts[0]?.trim() || "application/octet-stream";
    const isBase64 = parts.some((p) => p.trim().toLowerCase() === "base64");
    if (!isBase64) return null;
    return { mime, data: Buffer.from(raw.slice(comma + 1), "base64") };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// In-memory progress state
// ---------------------------------------------------------------------------
interface ProgressRecord {
  md5: string;
  name: string;
  user: string;
  device: string;
  progress: number;
  last_ts: number;
  last_iso: string;
  // raw sync fields
  raw_progress: string;
  percentage: number;
  device_id: string;
}

let RECENT: ProgressRecord[] = [];
let LAST_BY_MD5: Record<string, ProgressRecord> = {};
let USER_STATS: Record<string, UserStat> = {};

function userDir(user: string): string {
  return path.join(USERS_DIR, user);
}

function scanState(): void {
  const recent: ProgressRecord[] = [];
  const lastByMd5: Record<string, ProgressRecord> = {};
  const userStats: Record<string, UserStat> = {};

  if (!fs.existsSync(USERS_DIR)) return;

  for (const user of fs.readdirSync(USERS_DIR)) {
    const udir = path.join(USERS_DIR, user);
    if (!fs.statSync(udir).isDirectory()) continue;

    let uBooks = 0;
    let uLast = 0;
    const uDevices = new Set<string>();

    for (const fn of fs.readdirSync(udir)) {
      if (!fn.endsWith(".json") || fn === "auth.json" || fn === "statistics.json") continue;
      const st = safeReadJson(path.join(udir, fn)) as Record<string, unknown> | null;
      if (!st || typeof st !== "object") continue;

      const md5 = st["document"] as string;
      if (typeof md5 !== "string" || !HEX32.test(md5)) continue;

      const name = path.basename((INDEX[md5] as string) || md5);
      let pct = parseFloat(String(st["percentage"] || 0));
      if (pct <= 1.0) pct *= 100;
      const ts = Number(st["timestamp"] || 0);
      const dev = String(st["device"] || "");

      const rec: ProgressRecord = {
        md5,
        name,
        user,
        device: dev,
        progress: Math.round(pct * 10) / 10,
        last_ts: ts,
        last_iso: isoTs(ts),
        raw_progress: String(st["progress"] || ""),
        percentage: parseFloat(String(st["percentage"] || 0)),
        device_id: String(st["device_id"] || ""),
      };

      recent.push(rec);
      uBooks++;
      if (ts > uLast) uLast = ts;
      if (dev) uDevices.add(dev);

      if (!lastByMd5[md5] || ts > (lastByMd5[md5]?.last_ts || 0)) {
        lastByMd5[md5] = rec;
      }
    }

    userStats[user] = {
      user,
      books: uBooks,
      last_ts: uLast,
      last_iso: isoTs(uLast),
      devices: Array.from(uDevices).sort(),
    };
  }

  recent.sort((a, b) => b.last_ts - a.last_ts);
  RECENT = recent;
  LAST_BY_MD5 = lastByMd5;
  USER_STATS = userStats;
}

// ---------------------------------------------------------------------------
// Book card builder
// ---------------------------------------------------------------------------
function makeBookCard(md5: string, name: string, filePath: string | null): BookCard {
  const ext = (path.extname(name).slice(1) || "").toLowerCase();
  const folder = filePath ? path.basename(path.dirname(filePath)) : "";

  let sizeHuman = "";
  let mtimeIso = "";
  if (filePath && fs.existsSync(filePath)) {
    try {
      const st = fs.statSync(filePath);
      sizeHuman = humanBytes(st.size);
      mtimeIso = isoTs(st.mtimeMs / 1000);
    } catch {
      // ignore
    }
  }

  const last = LAST_BY_MD5[md5];

  return {
    md5,
    name,
    display_title: name,
    display_author: "",
    path: filePath,
    ext,
    folder,
    size_human: sizeHuman,
    mtime_iso: mtimeIso,
    has_cover: hasCover(md5),
    last_progress: last?.progress || 0,
    last_read_iso: last?.last_iso || "",
    last_user: last?.user || "",
    last_device: last?.device || "",
    last_ts: last?.last_ts || 0,
    epub_has_meta: false,
    epub_title: "",
    epub_authors: [],
    epub_publisher: "",
    epub_language: "",
    epub_date: "",
    epub_series: "",
    epub_series_index: "",
    epub_subjects: [],
    epub_identifiers: [],
    epub_description: "",
  };
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------
let AGG_STATS: StatsResponse = {
  active_books: 0,
  completed: 0,
  in_progress: 0,
  not_started: 0,
  avg_progress: 0,
  users: 0,
  last_activity_iso: "",
  last_activity_age: "",
  days_active_last14: 0,
  top_recent: [],
  users_breakdown: [],
};

function computeAggregates(): void {
  const now = Math.floor(Date.now() / 1000);
  const uniques = Object.values(LAST_BY_MD5);
  const active = uniques.length;
  const completed = uniques.filter((r) => (r.progress || 0) >= 99.5).length;
  const inProgress = uniques.filter((r) => (r.progress || 0) > 0 && (r.progress || 0) < 99.5).length;
  const avg = active ? uniques.reduce((s, r) => s + (r.progress || 0), 0) / active : 0;
  const lastTs = uniques.reduce((m, r) => Math.max(m, r.last_ts || 0), 0);

  const daySet = new Set<string>();
  for (const r of RECENT) {
    if ((r.last_ts || 0) >= now - 14 * 86400) {
      daySet.add(new Date((r.last_ts > 1e12 ? r.last_ts : r.last_ts * 1000)).toISOString().slice(0, 10));
    }
  }

  const topRecentCards: BookCard[] = [];
  for (const r of RECENT.slice(0, 10)) {
    const p = INDEX[r.md5] || "";
    const nm = p ? path.basename(p) : r.name;
    topRecentCards.push(makeBookCard(r.md5, nm, p || null));
  }

  const usersBreakdown = Object.values(USER_STATS)
    .sort((a, b) => b.last_ts - a.last_ts)
    .slice(0, 10);

  AGG_STATS = {
    active_books: active,
    completed,
    in_progress: inProgress,
    not_started: Math.max(active - completed - inProgress, 0),
    avg_progress: Math.round(avg * 10) / 10,
    users: Object.keys(USER_STATS).length,
    last_activity_iso: lastTs ? isoTs(lastTs) : "",
    last_activity_age: lastTs ? humanAge(now - lastTs) : "",
    days_active_last14: daySet.size,
    top_recent: topRecentCards,
    users_breakdown: usersBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Background refresh loop
// ---------------------------------------------------------------------------
function refreshLoop(): void {
  try {
    scanState();
    computeAggregates();
  } catch (e) {
    logger.error({ err: e }, "State scan error");
  }
  setTimeout(refreshLoop, 3000);
}

scanState();
computeAggregates();
refreshLoop();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getStats(): StatsResponse {
  return AGG_STATS;
}

export function searchLibrary(
  q: string,
  opts: { ext?: string; onlyCover?: boolean; onlyRecent?: boolean; limit?: number } = {}
): BookCard[] {
  const query = (q || "").toLowerCase().trim();
  if (!query) return [];

  const { ext, onlyCover, onlyRecent, limit = 50 } = opts;
  const results: Array<BookCard & { score: number }> = [];

  for (const b of LIB) {
    if (!b.name.toLowerCase().includes(query)) continue;
    const card = makeBookCard(b.md5, b.name, b.path || null);
    if (ext && card.ext !== ext) continue;
    if (onlyCover && !card.has_cover) continue;
    if (onlyRecent && !card.last_ts) continue;

    const pos = b.name.toLowerCase().indexOf(query);
    const score = (pos === 0 ? 0 : 10 + pos) + Math.max(b.name.length - query.length, 0) / 1000;
    results.push({ ...card, score });
  }

  results.sort((a, b) => a.score - b.score || b.last_ts - a.last_ts);
  return results.slice(0, limit);
}

export function getSyncRecord(user: string, document: string): SyncRecord | null {
  const filePath = path.join(userDir(user), document + ".json");
  if (!fs.existsSync(filePath)) return null;
  const data = safeReadJson(filePath) as Record<string, unknown> | null;
  if (!data) return null;
  return {
    document: String(data["document"] || document),
    progress: String(data["progress"] || ""),
    percentage: parseFloat(String(data["percentage"] || 0)),
    device: String(data["device"] || ""),
    device_id: String(data["device_id"] || ""),
    timestamp: Number(data["timestamp"] || 0),
  };
}

export function upsertSyncRecord(
  user: string,
  document: string,
  update: { progress: string; percentage: number; device: string; device_id: string }
): SyncRecord {
  fs.mkdirSync(userDir(user), { recursive: true });
  const existing = getSyncRecord(user, document) || {};
  const record = {
    ...existing,
    document,
    ...update,
    timestamp: Math.floor(Date.now() / 1000),
  };
  safeWriteJson(path.join(userDir(user), document + ".json"), record);
  return record as SyncRecord;
}

export function getOrCreateUser(username: string): { authorized: boolean; user: string } {
  const uDir = userDir(username);
  fs.mkdirSync(uDir, { recursive: true });
  const authFile = path.join(uDir, "auth.json");
  if (!fs.existsSync(authFile)) {
    safeWriteJson(authFile, { username, created: new Date().toISOString() });
  }
  return { authorized: true, user: username };
}
