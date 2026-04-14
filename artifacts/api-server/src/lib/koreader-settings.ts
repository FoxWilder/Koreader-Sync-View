import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Minimal ZIP reader (no dependencies — EPUBs are ZIP files)
// ---------------------------------------------------------------------------

/** Read a named entry from a ZIP file buffer. Returns null if not found. */
function readZipEntry(buf: Buffer, entryName: string): Buffer | null {
  // Scan local file headers (signature 0x04034b50) sequentially.
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      offset++;
      continue;
    }
    const compression    = buf.readUInt16LE(offset + 8);
    const compressedSz   = buf.readUInt32LE(offset + 18);
    const uncompressedSz = buf.readUInt32LE(offset + 22);
    const fileNameLen    = buf.readUInt16LE(offset + 26);
    const extraLen       = buf.readUInt16LE(offset + 28);
    const dataOffset     = offset + 30 + fileNameLen + extraLen;
    const name           = buf.subarray(offset + 30, offset + 30 + fileNameLen).toString("utf-8");

    if (name === entryName) {
      const compressed = buf.subarray(dataOffset, dataOffset + compressedSz);
      if (compression === 0) return compressed;
      if (compression === 8) {
        return zlib.inflateRawSync(compressed, { maxOutputLength: uncompressedSz + 1024 });
      }
      return null; // unsupported compression method
    }

    offset = dataOffset + compressedSz;
  }
  return null;
}

/** Extract the cover image from an EPUB file. Returns a data-URL string or null. */
function extractEpubCover(epubPath: string): string | null {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(epubPath);
  } catch {
    return null;
  }

  // 1. Read META-INF/container.xml to find the OPF path
  const containerXml = readZipEntry(buf, "META-INF/container.xml");
  if (!containerXml) return null;

  const containerStr = containerXml.toString("utf-8");
  const opfMatch = containerStr.match(/full-path=["']([^"']+\.opf)["']/i);
  if (!opfMatch) return null;
  const opfPath = opfMatch[1];

  // 2. Read the OPF file
  const opfBuf = readZipEntry(buf, opfPath);
  if (!opfBuf) return null;
  const opfStr = opfBuf.toString("utf-8");

  // 3. Find the cover image href via multiple strategies:
  //    a) <meta name="cover" content="cover-id"/> → look up item by id
  //    b) item with properties="cover-image"
  //    c) item whose id/href contains "cover"
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  let coverHref: string | null = null;

  // Strategy a: <meta name="cover" content="..."/>
  const metaCoverMatch = opfStr.match(/<meta[^>]+name=["']cover["'][^>]+content=["']([^"']+)["']/i)
    ?? opfStr.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']cover["']/i);
  if (metaCoverMatch) {
    const coverId = metaCoverMatch[1];
    const itemMatch = opfStr.match(new RegExp(`<item[^>]+id=["']${coverId}["'][^>]+href=["']([^"']+)["']`, "i"))
      ?? opfStr.match(new RegExp(`<item[^>]+href=["']([^"']+)["'][^>]+id=["']${coverId}["']`, "i"));
    if (itemMatch) coverHref = itemMatch[1];
  }

  // Strategy b: properties="cover-image"
  if (!coverHref) {
    const propMatch = opfStr.match(/<item[^>]+properties=["'][^"']*cover-image[^"']*["'][^>]+href=["']([^"']+)["']/i)
      ?? opfStr.match(/<item[^>]+href=["']([^"']+)["'][^>]+properties=["'][^"']*cover-image[^"']*["']/i);
    if (propMatch) coverHref = propMatch[1];
  }

  // Strategy c: item href/id containing "cover" with an image media-type
  if (!coverHref) {
    const fallback = opfStr.match(/<item[^>]+media-type=["']image\/[^"']+["'][^>]+href=["']([^"']*cover[^"']*)["']/i)
      ?? opfStr.match(/<item[^>]+href=["']([^"']*cover[^"']*)["'][^>]+media-type=["']image\/[^"']+["']/i);
    if (fallback) coverHref = fallback[1];
  }

  if (!coverHref) return null;

  // Resolve relative to OPF directory
  const entryPath = opfDir + coverHref;

  // 4. Read the image entry
  const imgBuf = readZipEntry(buf, entryPath);
  if (!imgBuf || imgBuf.length === 0) return null;

  // Detect MIME type from magic bytes
  let mime = "image/jpeg";
  if (imgBuf[0] === 0x89 && imgBuf[1] === 0x50) mime = "image/png";
  else if (imgBuf[0] === 0x47 && imgBuf[1] === 0x49) mime = "image/gif";
  else if (imgBuf[0] === 0x52 && imgBuf[1] === 0x49) mime = "image/webp";

  return `data:${mime};base64,${imgBuf.toString("base64")}`;
}

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
// MD5 of filename (matches how KOReader identifies documents)
// ---------------------------------------------------------------------------
function filenameMd5(filePath: string): string {
  return crypto.createHash("md5").update(path.basename(filePath)).digest("hex");
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
// Cover extraction
// ---------------------------------------------------------------------------

/** Write a cover data-URL to covers/{md5}.txt, skipping if already present. */
function writeCoverFile(md5: string, dataUrl: string): void {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  const dest = path.join(COVERS_DIR, md5 + ".txt");
  if (fs.existsSync(dest)) return; // already cached
  fs.writeFileSync(dest, dataUrl, "utf-8");
}

/**
 * Extract covers for a list of [md5, filePath] epub entries.
 * Runs one file per event-loop tick to avoid blocking the server.
 */
function extractCoversAsync(entries: [string, string][]): void {
  let i = 0;
  let extracted = 0;

  function next(): void {
    if (i >= entries.length) {
      logger.info({ extracted, total: entries.length }, "Cover extraction complete");
      return;
    }
    const [md5, filePath] = entries[i++];
    const coverPath = path.join(COVERS_DIR, md5 + ".txt");
    if (!fs.existsSync(coverPath)) {
      try {
        const dataUrl = extractEpubCover(filePath);
        if (dataUrl) {
          writeCoverFile(md5, dataUrl);
          extracted++;
        }
      } catch (e) {
        logger.warn({ err: e, file: path.basename(filePath) }, "Cover extraction failed");
      }
    }
    setImmediate(next);
  }

  next();
}

// ---------------------------------------------------------------------------
// Trigger scan / rebuild
// ---------------------------------------------------------------------------

/** Wipe the existing cache then run a full scan. */
export function triggerRebuild(): ScanStatus {
  if (scanStatus.running) {
    return getScanStatus();
  }
  // Clear cache before scanning so stale entries are removed
  writeCache({});
  return triggerScan();
}

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

  // Phase 1: build MD5 cache synchronously (no I/O per file)
  try {
    const existingCache = readCache();
    const newCache: Record<string, string> = {};

    for (const filePath of files) {
      scanStatus.current_file = path.basename(filePath);
      newCache[filenameMd5(filePath)] = filePath;
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

    // Phase 2: extract covers asynchronously so the scan status resolves immediately.
    // Only process EPUBs that don't already have a cover cached.
    const epubEntries = Object.entries(merged).filter(
      ([, fp]) => path.extname(fp).toLowerCase() === ".epub"
    );
    setImmediate(() => extractCoversAsync(epubEntries));
  } catch (e) {
    scanStatus.running = false;
    scanStatus.error = String(e);
    scanStatus.finished_at = new Date().toISOString();
    logger.error({ err: e }, "Library scan failed");
  }

  return getScanStatus();
}
