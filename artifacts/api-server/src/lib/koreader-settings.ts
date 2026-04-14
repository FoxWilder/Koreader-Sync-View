import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "./logger";

const DATA_DIR = process.env.KOREADER_DATA_DIR || path.join(process.cwd(), "koreader-data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const CACHE_FILE = process.env.KOREADER_CACHE || path.join(DATA_DIR, "book-md5-cache.json");
const USERS_DIR = path.join(DATA_DIR, "users");
const COVERS_DIR = path.join(DATA_DIR, "covers");

const SUPPORTED_EXTENSIONS = ["epub", "pdf", "mobi", "azw", "azw3", "cbz", "cbr", "djvu", "fb2", "txt"];

export interface Settings {
  library_path: string;
  data_dir: string;
  users_dir: string;
  covers_dir: string;
  cache_file: string;
  book_count: number;
  last_scan_iso: string;
  supported_extensions: string[];
}

export interface ScanStatus {
  running: boolean;
  files_found: number;
  files_processed: number;
  current_file: string;
  started_at: string;
  finished_at: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Persistent settings
// ---------------------------------------------------------------------------
interface StoredSettings {
  library_path?: string;
  last_scan_iso?: string;
  book_count?: number;
}

function readStoredSettings(): StoredSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as StoredSettings;
    }
  } catch {
    // ignore
  }
  return {};
}

function writeStoredSettings(s: StoredSettings): void {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Cache read/write
// ---------------------------------------------------------------------------
function readCache(): Record<string, string> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}

function writeCache(cache: Record<string, string>): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  const tmp = CACHE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf-8");
  fs.renameSync(tmp, CACHE_FILE);
}

// ---------------------------------------------------------------------------
// Public settings API
// ---------------------------------------------------------------------------
export function getSettings(): Settings {
  const stored = readStoredSettings();
  const cache = readCache();

  return {
    library_path: stored.library_path || "",
    data_dir: DATA_DIR,
    users_dir: USERS_DIR,
    covers_dir: COVERS_DIR,
    cache_file: CACHE_FILE,
    book_count: Object.keys(cache).length,
    last_scan_iso: stored.last_scan_iso || "",
    supported_extensions: SUPPORTED_EXTENSIONS,
  };
}

export function updateLibraryPath(libraryPath: string): Settings {
  const stored = readStoredSettings();
  stored.library_path = libraryPath;
  writeStoredSettings(stored);
  return getSettings();
}

// ---------------------------------------------------------------------------
// Scan state
// ---------------------------------------------------------------------------
const scanStatus: ScanStatus = {
  running: false,
  files_found: 0,
  files_processed: 0,
  current_file: "",
  started_at: "",
  finished_at: "",
  error: "",
};

export function getScanStatus(): ScanStatus {
  return { ...scanStatus };
}

// ---------------------------------------------------------------------------
// MD5 of file content (streaming)
// ---------------------------------------------------------------------------
async function fileMd5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Recursive directory walk
// ---------------------------------------------------------------------------
function* walkDir(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs and common non-book dirs
      if (!entry.name.startsWith(".")) {
        yield* walkDir(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        yield fullPath;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Trigger scan
// ---------------------------------------------------------------------------
export function triggerScan(): ScanStatus {
  if (scanStatus.running) {
    return getScanStatus();
  }

  const stored = readStoredSettings();
  const libraryPath = stored.library_path || "";

  if (!libraryPath || !fs.existsSync(libraryPath)) {
    scanStatus.error = "Library path is not set or does not exist. Please configure it in Settings.";
    return getScanStatus();
  }

  // Reset scan state
  Object.assign(scanStatus, {
    running: true,
    files_found: 0,
    files_processed: 0,
    current_file: "",
    started_at: new Date().toISOString(),
    finished_at: "",
    error: "",
  });

  // Collect file list first
  const files: string[] = [];
  for (const f of walkDir(libraryPath)) {
    files.push(f);
  }
  scanStatus.files_found = files.length;

  logger.info({ count: files.length, path: libraryPath }, "Library scan started");

  // Process asynchronously
  (async () => {
    const existingCache = readCache();
    const newCache: Record<string, string> = {};

    for (const filePath of files) {
      scanStatus.current_file = path.basename(filePath);
      try {
        const md5 = await fileMd5(filePath);
        newCache[md5] = filePath;
      } catch (e) {
        logger.warn({ err: e, file: filePath }, "Failed to hash file");
      }
      scanStatus.files_processed++;
    }

    // Merge: keep existing entries not found in new scan (files on other machines)
    const merged: Record<string, string> = { ...existingCache, ...newCache };
    writeCache(merged);

    const s = readStoredSettings();
    s.last_scan_iso = new Date().toISOString();
    s.book_count = Object.keys(merged).length;
    writeStoredSettings(s);

    Object.assign(scanStatus, {
      running: false,
      current_file: "",
      finished_at: new Date().toISOString(),
      files_found: files.length,
      files_processed: files.length,
    });

    logger.info({ total: Object.keys(merged).length }, "Library scan complete");
  })().catch((e) => {
    scanStatus.running = false;
    scanStatus.error = String(e);
    scanStatus.finished_at = new Date().toISOString();
    logger.error({ err: e }, "Library scan failed");
  });

  return getScanStatus();
}
