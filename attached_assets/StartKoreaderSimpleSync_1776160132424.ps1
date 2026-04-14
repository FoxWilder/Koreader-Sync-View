<#
.SYNOPSIS
  KOReader Smart Library + Progress Sync Launcher
  Fancy dashboard cards + EPUB metadata + full-width progress bars

.NOTES
  - Dashboard: http://localhost:7300
  - Sync API : http://localhost:<Port> (default 7200)
  - Keeps the SyncHandler placeholder exactly like your current compat script.
#>

[CmdletBinding()]
param(
    [int]$Port = 7200
)

$VerbosePreference = 'Continue'
Write-Host "[PS] ===== KOReader Smart Library (7300 UI) + KOReader Progress Sync ($Port) =====" -ForegroundColor Cyan

## ---------- PATHS ----------
$BaseDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$AppDir  = Join-Path $BaseDir "app"
$Python  = Join-Path $BaseDir ".venv\Scripts\python.exe"
$Cache   = Join-Path $BaseDir "book-md5-cache.json"

if (!(Test-Path $Python)) { throw "Python not found: $Python" }
if (!(Test-Path $AppDir)) { throw "App dir missing: $AppDir" }
if (!(Test-Path $Cache))  { throw "Cache JSON missing: $Cache" }

## ---------- ENV ----------
$env:LOCALAPPDATA = Join-Path $BaseDir "data"

Write-Host "[PS] Sync API     : http://localhost:$Port" -ForegroundColor Green
Write-Host "[PS] Dashboard    : http://localhost:7300" -ForegroundColor Yellow
Write-Host "[PS] LOCALAPPDATA : $env:LOCALAPPDATA"
Write-Host "[PS] Cache        : $Cache"

## ---------- PYTHON LAUNCHER (Strict UTF-8 No BOM) ----------
$Launcher = @'
import os, json, time, threading, re, hashlib, base64, zipfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import xml.etree.ElementTree as ET

SYNC_PORT = int("**PORT**")
CACHE = r"**CACHE**"

STATE_ROOT = os.path.join(os.environ.get("LOCALAPPDATA",""), "users")
COVERS_DIR = os.path.join(os.environ.get("LOCALAPPDATA",""), "covers")
os.makedirs(COVERS_DIR, exist_ok=True)

HEX32 = re.compile(r"^[0-9a-fA-F]{32}$")

def log(prefix, msg):
    print(f"[{prefix}] {msg}", flush=True)

def iso(ts):
    try:
        ts = float(ts)
        if ts > 1e12: ts /= 1000
        return datetime.fromtimestamp(ts).isoformat(" ", "seconds")
    except:
        return ""

def md5_hex(s: str) -> str:
    return hashlib.md5(s.encode("utf-8", "ignore")).hexdigest()

def safe_load_json(path):
    for enc in ("utf-8", "utf-8-sig", "utf-16"):
        try:
            with open(path, "r", encoding=enc) as f:
                return json.load(f)
        except:
            pass
    return None

def safe_write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    os.replace(tmp, path)

def human_bytes(n):
    try:
        n = float(n)
    except:
        return ""
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while n >= 1024 and i < len(units)-1:
        n /= 1024
        i += 1
    return f"{n:.1f} {units[i]}" if i > 0 else f"{int(n)} {units[i]}"

def human_age(seconds):
    try:
        seconds = int(seconds)
    except:
        return ""
    if seconds < 60: return f"{seconds}s"
    m = seconds // 60
    if m < 60: return f"{m}m"
    h = m // 60
    if h < 48: return f"{h}h"
    return f"{h//24}d"

# ---------------------------
# Library
# ---------------------------
INDEX = {}
LIB = []
raw = safe_load_json(CACHE) or {}
for md5, fullpath in raw.items():
    INDEX[md5] = fullpath
    LIB.append({"md5": md5, "name": os.path.basename(fullpath), "path": fullpath})

log("DASH", f"Library entries: {len(LIB)}")

# ---------------------------
# Covers (base64 data URL stored as md5.txt)
# ---------------------------
def cover_txt_path(md5):
    p = os.path.join(COVERS_DIR, md5 + ".txt")
    return p if os.path.exists(p) else None

def has_cover(md5):
    return cover_txt_path(md5) is not None

def parse_data_url(s):
    if not s or not s.strip().lower().startswith("data:"):
        return None, None
    try:
        header, b64 = s.split(",", 1)
        header = header[5:]
        parts = header.split(";")
        mime = parts[0].strip() if parts else "application/octet-stream"
        if not any(p.strip().lower() == "base64" for p in parts[1:]):
            return None, None
        data = base64.b64decode(b64.strip(), validate=False)
        return mime, data
    except:
        return None, None

def read_cover_bytes(md5):
    p = cover_txt_path(md5)
    if not p: return None, None
    try:
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return parse_data_url(f.read())
    except:
        return None, None

PLACEHOLDER_SVG = b"""<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='#1f2937'/><stop offset='1' stop-color='#0b0e14'/>
</linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<rect x='18' y='18' width='204' height='324' rx='18' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.12)'/>
<text x='50%' y='48%' fill='rgba(255,255,255,0.7)' font-family='Segoe UI,system-ui' font-size='18' text-anchor='middle'>No cover</text>
<text x='50%' y='56%' fill='rgba(255,255,255,0.35)' font-family='Segoe UI,system-ui' font-size='12' text-anchor='middle'>KOReader</text>
</svg>"""

# ---------------------------
# EPUB metadata (cached)
# ---------------------------
EPUB_META_CACHE = {}  # key: (path, mtime, size) -> dict

def _local(tag):
    return tag.split("}")[-1] if "}" in tag else tag

def _clean(s, max_len=None):
    if not s: return ""
    s = " ".join(str(s).replace("\r", " ").replace("\n", " ").split())
    if max_len and len(s) > max_len:
        return s[:max_len-1].rstrip() + "…"
    return s

def epub_meta(path):
    try:
        st = os.stat(path)
        key = (path, int(st.st_mtime), int(st.st_size))
    except:
        return {}

    if key in EPUB_META_CACHE:
        return EPUB_META_CACHE[key]

    meta = {}
    try:
        with zipfile.ZipFile(path, "r") as z:
            # locate OPF via container.xml
            cont = z.read("META-INF/container.xml")
            root = ET.fromstring(cont)
            opf_path = None
            for el in root.iter():
                if _local(el.tag) == "rootfile":
                    opf_path = el.attrib.get("full-path")
                    break
            if not opf_path:
                EPUB_META_CACHE[key] = {}
                return {}

            opf = z.read(opf_path)
            opf_root = ET.fromstring(opf)

            # gather dc:* and common meta
            titles, creators, subjects, identifiers = [], [], [], []
            publisher = language = date = description = ""
            series = ""
            series_index = ""

            for el in opf_root.iter():
                ln = _local(el.tag).lower()
                txt = (el.text or "").strip()

                if ln == "title" and txt:
                    titles.append(_clean(txt))
                elif ln == "creator" and txt:
                    creators.append(_clean(txt))
                elif ln == "subject" and txt:
                    subjects.append(_clean(txt))
                elif ln == "identifier" and txt:
                    identifiers.append(_clean(txt))
                elif ln == "publisher" and txt and not publisher:
                    publisher = _clean(txt)
                elif ln == "language" and txt and not language:
                    language = _clean(txt)
                elif ln == "date" and txt and not date:
                    date = _clean(txt)
                elif ln == "description" and txt and not description:
                    description = _clean(txt, 420)

                # EPUB2 calibre-style series
                if ln == "meta":
                    name = (el.attrib.get("name") or "").strip().lower()
                    content = (el.attrib.get("content") or "").strip()
                    prop = (el.attrib.get("property") or "").strip().lower()

                    if name == "calibre:series" and content and not series:
                        series = _clean(content)
                    if name == "calibre:series_index" and content and not series_index:
                        series_index = _clean(content)

                    # EPUB3 collection
                    if prop == "belongs-to-collection" and txt and not series:
                        series = _clean(txt)
                    if prop == "group-position" and txt and not series_index:
                        series_index = _clean(txt)

            meta = {
                "title": titles[0] if titles else "",
                "authors": creators[:6],
                "publisher": publisher,
                "language": language,
                "date": date,
                "subjects": subjects[:10],
                "identifiers": identifiers[:6],
                "description": description,
                "series": series,
                "series_index": series_index
            }
    except Exception as e:
        meta = {}

    EPUB_META_CACHE[key] = meta
    return meta

# ---------------------------
# State & Stats
# ---------------------------
RECENT = []
LAST_BY_MD5 = {}
USER_STATS = {}
AGG_STATS = {}

def user_dir(user): return os.path.join(STATE_ROOT, user)

def scan_state():
    RECENT.clear()
    LAST_BY_MD5.clear()
    USER_STATS.clear()
    if not os.path.isdir(STATE_ROOT): return

    for user in os.listdir(STATE_ROOT):
        udir = os.path.join(STATE_ROOT, user)
        if not os.path.isdir(udir): continue
        u_books = u_last = 0
        u_devices = set()
        for fn in os.listdir(udir):
            if not fn.endswith(".json") or fn in ("auth.json", "statistics.json"): 
                continue
            st = safe_load_json(os.path.join(udir, fn))
            if not isinstance(st, dict): 
                continue
            md5 = st.get("document")
            if not isinstance(md5, str) or not HEX32.match(md5): 
                continue
            name = os.path.basename(INDEX.get(md5, md5))
            pct = float(st.get("percentage", 0) or 0)
            if pct <= 1.0: pct *= 100
            ts = st.get("timestamp", 0) or 0
            dev = st.get("device", "") or ""

            rec = {"md5": md5, "name": name, "user": user, "device": dev,
                   "progress": round(pct, 1), "last_ts": ts, "last_iso": iso(ts)}
            RECENT.append(rec)

            u_books += 1
            if ts > u_last: u_last = ts
            if dev: u_devices.add(dev)

            if md5 not in LAST_BY_MD5 or ts > (LAST_BY_MD5[md5].get("last_ts") or 0):
                LAST_BY_MD5[md5] = rec

        USER_STATS[user] = {"books": u_books, "last_ts": u_last, "last_iso": iso(u_last), "devices": sorted(list(u_devices))}

    RECENT.sort(key=lambda x: x.get("last_ts", 0), reverse=True)

def file_meta(path):
    try:
        st = os.stat(path)
        return st.st_size, int(st.st_mtime)
    except:
        return None, None

def make_book_card(md5, name, path):
    ext = os.path.splitext(name)[1].lower().lstrip(".") or ""
    folder = os.path.basename(os.path.dirname(path)) if path else ""
    size, mtime = file_meta(path) if path else (None, None)
    last = LAST_BY_MD5.get(md5, {})

    em = {}
    if ext == "epub" and path and os.path.exists(path):
        em = epub_meta(path) or {}

    display_title = em.get("title") or name
    display_authors = em.get("authors") or []
    display_author = ", ".join(display_authors) if display_authors else ""

    return {
        "md5": md5,
        "name": name,
        "display_title": display_title,
        "display_author": display_author,
        "path": path,
        "ext": ext,
        "folder": folder,
        "size_human": human_bytes(size) if size else "",
        "mtime_iso": iso(mtime) if mtime else "",
        "has_cover": has_cover(md5),

        "last_progress": float(last.get("progress", 0) or 0),
        "last_read_iso": last.get("last_iso", ""),
        "last_user": last.get("user", ""),
        "last_device": last.get("device", ""),
        "last_ts": last.get("last_ts", 0) or 0,

        # EPUB meta (empty for non-epub)
        "epub_has_meta": True if em else False,
        "epub_title": em.get("title",""),
        "epub_authors": em.get("authors", []),
        "epub_publisher": em.get("publisher",""),
        "epub_language": em.get("language",""),
        "epub_date": em.get("date",""),
        "epub_series": em.get("series",""),
        "epub_series_index": em.get("series_index",""),
        "epub_subjects": em.get("subjects", []),
        "epub_identifiers": em.get("identifiers", []),
        "epub_description": em.get("description","")
    }

def compute_aggregates():
    now = int(time.time())
    uniques = list(LAST_BY_MD5.values())
    active = len(uniques)
    completed = sum(1 for r in uniques if (r.get("progress") or 0) >= 99.5)
    in_progress = sum(1 for r in uniques if 0 < (r.get("progress") or 0) < 99.5)

    avg = sum(float(r.get("progress") or 0) for r in uniques) / active if active else 0
    last_ts = max((r.get("last_ts") or 0 for r in uniques), default=0)
    last_age = human_age(now - int(last_ts)) if last_ts else ""

    day_set = {datetime.fromtimestamp(int(r.get("last_ts") or 0)).date().isoformat()
               for r in RECENT if (r.get("last_ts") or 0) >= now - 14*86400 and r.get("last_ts")}

    # Build fancy recent cards (enriched with file + epub metadata)
    top_recent_cards = []
    for r in RECENT[:10]:
        p = INDEX.get(r["md5"], "")
        nm = os.path.basename(p) if p else r.get("name","")
        top_recent_cards.append(make_book_card(r["md5"], nm, p))

    AGG_STATS.clear()
    AGG_STATS.update({
        "active_books": active,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": max(active - completed - in_progress, 0),
        "avg_progress": round(avg, 1),
        "users": len([u for u in USER_STATS if os.path.isdir(user_dir(u))]),
        "last_activity_iso": iso(last_ts),
        "last_activity_age": last_age,
        "days_active_last14": len(day_set),
        "top_recent": top_recent_cards,
        "users_breakdown": [
            {"user": u, **USER_STATS[u]} for u in sorted(USER_STATS, key=lambda x: USER_STATS[x]["last_ts"], reverse=True)
        ][:10]
    })

def refresh_loop():
    while True:
        try:
            scan_state()
            compute_aggregates()
        except Exception as e:
            log("DASH", f"scan error: {e}")
        time.sleep(3)

scan_state()
compute_aggregates()
threading.Thread(target=refresh_loop, daemon=True).start()

# ---------------------------
# Search
# ---------------------------
def search(q, limit=50, f_ext=None, only_cover=False, only_recent=False):
    q = (q or "").lower().strip()
    if not q: return []
    results = []
    for b in LIB:
        if q not in b["name"].lower():
            continue
        card = make_book_card(b["md5"], b["name"], b.get("path"))
        if f_ext and card["ext"] != f_ext: 
            continue
        if only_cover and not card["has_cover"]: 
            continue
        if only_recent and not card["last_ts"]: 
            continue

        pos = b["name"].lower().find(q)
        card["score"] = (0 if pos == 0 else 10 + pos) + max(len(b["name"]) - len(q), 0) / 1000
        results.append(card)
    results.sort(key=lambda x: (x["score"], -x["last_ts"]))
    return results[:limit]

# ---------------------------
# Dashboard HTML (Fancy cards + EPUB metadata + full-width progress bars)
# ---------------------------
def dashboard_html():
    return '''<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>KOReader Dashboard</title>
<style>
  :root{
    --bg:#0b0e14;
    --panel:#0f172a;
    --panel2:#111827;
    --text:#e5e7eb;
    --muted:#9ca3af;
    --accent:#60a5fa;
    --good:#34d399;
    --warn:#fbbf24;
    --bad:#fb7185;
    --stroke:rgba(255,255,255,.10);
    --stroke2:rgba(255,255,255,.06);
  }
  *{box-sizing:border-box}
  body{
    margin:0;
    font-family:Segoe UI,system-ui,sans-serif;
    color:var(--text);
    background:
      radial-gradient(1200px 600px at 20% 10%,#16233a 0%,transparent 55%),
      radial-gradient(900px 600px at 80% 0%,#1b2a4a 0%,transparent 50%),
      radial-gradient(900px 500px at 60% 100%,#0b3a2a 0%,transparent 55%),
      var(--bg);
  }
  .top{
    padding:18px 18px 12px;
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap:16px;
    border-bottom:1px solid var(--stroke2);
    backdrop-filter:blur(10px);
    position:sticky; top:0;
    background:rgba(11,14,20,.72);
    z-index:20;
  }
  .brand h1{margin:0;font-size:18px;letter-spacing:.2px}
  .brand .sub{margin-top:4px;color:var(--muted);font-size:12px}
  .searchbar{display:flex;gap:10px;align-items:center;width:min(920px,100%)}
  input{
    flex:1;
    padding:13px 14px;
    border-radius:16px;
    border:1px solid var(--stroke);
    background:rgba(255,255,255,.06);
    color:var(--text);
    outline:none;
  }
  input:focus{border-color:rgba(96,165,250,.55); box-shadow:0 0 0 4px rgba(96,165,250,.12)}
  .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .chip{
    padding:7px 10px;
    font-size:12px;
    border-radius:999px;
    border:1px solid var(--stroke);
    background:rgba(255,255,255,.04);
    cursor:pointer;
    user-select:none;
  }
  .chip:hover{border-color:rgba(96,165,250,.35)}
  .chip.active{border-color:rgba(96,165,250,.85); background:rgba(96,165,250,.14)}
  .wrap{
    padding:14px 18px 22px;
    display:grid;
    grid-template-columns:1.25fr .9fr;
    gap:14px;
  }
  @media (max-width:1100px){.wrap{grid-template-columns:1fr}}
  .panel{
    background:linear-gradient(180deg,rgba(17,24,39,.92),rgba(15,23,42,.92));
    border:1px solid var(--stroke2);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 14px 38px rgba(0,0,0,.28);
  }
  .ph{
    padding:12px 14px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:1px solid var(--stroke2);
  }
  .ph h2{margin:0;font-size:13px;color:#dbeafe;letter-spacing:.25px}
  .hint{color:var(--muted);font-size:12px}
  .pc{padding:12px 14px}
  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(420px, 1fr));
    gap:12px;
  }
  @media (max-width:520px){.grid{grid-template-columns:1fr}}

  /* --- Fancy Book Card --- */
  .bookcard{
    display:grid;
    grid-template-columns:96px 1fr;
    gap:14px;
    padding:16px;
    border-radius:22px;
    border:1px solid var(--stroke2);
    background:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02));
    position:relative;
    overflow:hidden;
    transition:transform .12s ease, border-color .12s ease, box-shadow .12s ease;
  }
  .bookcard:before{
    content:"";
    position:absolute; inset:-2px;
    background:radial-gradient(500px 240px at 15% 20%, rgba(96,165,250,.15), transparent 60%),
               radial-gradient(520px 240px at 75% 10%, rgba(52,211,153,.12), transparent 55%);
    pointer-events:none;
  }
  .bookcard:hover{
    transform:translateY(-1px);
    border-color:rgba(96,165,250,.30);
    box-shadow:0 16px 36px rgba(0,0,0,.25);
  }
  .cover{
    width:96px;height:140px;
    border-radius:14px;
    object-fit:cover;
    border:1px solid var(--stroke);
    background:rgba(255,255,255,.04);
    z-index:1;
  }
  .meta{min-width:0; z-index:1}
  .title{
    font-weight:750;
    font-size:15px;
    line-height:1.2;
    margin-top:2px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .author{
    margin-top:6px;
    color:rgba(229,231,235,.86);
    font-size:12.5px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .line{
    margin-top:8px;
    color:var(--muted);
    font-size:12px;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    align-items:center;
  }
  .badge{
    font-size:11px;
    padding:3px 9px;
    border-radius:999px;
    border:1px solid var(--stroke);
    background:rgba(255,255,255,.03);
  }
  .badge.good{border-color:rgba(52,211,153,.35); background:rgba(52,211,153,.10)}
  .badge.warn{border-color:rgba(251,191,36,.35); background:rgba(251,191,36,.10)}
  .badge.bad{border-color:rgba(251,113,133,.35); background:rgba(251,113,133,.10)}
  .badge.accent{border-color:rgba(96,165,250,.45); background:rgba(96,165,250,.14)}

  /* progress row: separate line across full card width */
  .progressrow{
    grid-column:1 / -1;
    z-index:1;
    margin-top:6px;
    padding-top:10px;
    border-top:1px dashed rgba(255,255,255,.10);
  }
  .progressmeta{
    display:flex;
    justify-content:space-between;
    gap:10px;
    align-items:baseline;
    font-size:12px;
    color:var(--muted);
  }
  .progressmeta b{color:rgba(229,231,235,.92); font-weight:700}
  .track{
    margin-top:8px;
    height:12px;
    border-radius:999px;
    background:rgba(255,255,255,.08);
    overflow:hidden;
    border:1px solid rgba(255,255,255,.09);
  }
  .fill{
    height:100%;
    width:0%;
    border-radius:999px;
    background:linear-gradient(90deg, rgba(52,211,153,.95), rgba(96,165,250,.95));
    transition:width .35s ease;
  }
  .fill.done{background:linear-gradient(90deg, rgba(52,211,153,.95), rgba(52,211,153,.95))}
  .fill.low{background:linear-gradient(90deg, rgba(251,191,36,.95), rgba(96,165,250,.80))}

  .desc{
    margin-top:10px;
    color:rgba(156,163,175,.92);
    font-size:12px;
    line-height:1.35;
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }

  .kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .kpi{
    padding:12px;
    border-radius:18px;
    border:1px solid var(--stroke2);
    background:rgba(255,255,255,.03)
  }
  .kpi .k{color:var(--muted);font-size:12px}
  .kpi .v{margin-top:4px;font-size:18px;font-weight:800}
  .kpi .s{margin-top:2px;color:rgba(156,163,175,.85);font-size:11px}

  .sectionTitle{
    color:#dbeafe;
    font-size:12px;
    margin:14px 0 6px;
    letter-spacing:.35px;
  }
</style>
</head>
<body>

<div class="top">
  <div class="brand">
    <h1>KOReader — Smart Library</h1>
    <div class="sub">Bigger cards • EPUB metadata • Full-width progress bars</div>
  </div>
  <div class="searchbar">
    <input id="q" placeholder="Search title or filename… (try: dune, finance, epub)" />
    <div class="chips" id="chips"></div>
  </div>
</div>

<div class="wrap">
  <div class="panel">
    <div class="ph"><h2>Library search</h2><div class="hint" id="searchHint">Type to search</div></div>
    <div class="pc">
      <div class="grid" id="searchOut"></div>
      <div class="hint" id="searchEmpty" style="margin-top:10px"></div>
    </div>
  </div>

  <div class="panel">
    <div class="ph"><h2>Reading stats</h2><div class="hint" id="statsHint"></div></div>
    <div class="pc">
      <div class="kpis" id="kpis"></div>

      <div class="sectionTitle">Latest activity</div>
      <div class="grid" id="recentGrid"></div>

      <div class="sectionTitle">Top users (by last activity)</div>
      <div id="userList"></div>
    </div>
  </div>
</div>

<script>
const state = { filter: "all" };
const chips = [
  {id:"all",label:"All"},
  {id:"epub",label:"EPUB"},
  {id:"pdf",label:"PDF"},
  {id:"cover",label:"With cover"},
  {id:"recent",label:"Has progress"}
];

function esc(s){ return (s||"").toString(); }

function renderChips(){
  const el = document.getElementById("chips");
  el.innerHTML = "";
  chips.forEach(c => {
    const b = document.createElement("div");
    b.className = `chip ${state.filter===c.id ? "active" : ""}`;
    b.textContent = c.label;
    b.onclick = () => { state.filter = c.id; renderChips(); loadSearch(); };
    el.appendChild(b);
  });
}

function badge(cls, txt){ return `<span class='badge ${cls}'>${esc(txt)}</span>`; }

function pctClass(p){
  p = Number(p||0);
  if (p >= 99.5) return "done";
  if (p > 0 && p < 25) return "low";
  return "";
}

function progressRow(it){
  const p = Math.max(0, Math.min(100, Number(it.last_progress||0)));
  const done = p >= 99.5;
  const last = it.last_read_iso ? `Last read: <b>${esc(it.last_read_iso)}</b>` : "No reading activity yet";
  const who = [it.last_user, it.last_device].filter(Boolean).join(" • ");
  return `
    <div class="progressrow">
      <div class="progressmeta">
        <div>Progress: <b>${p.toFixed(1)}%</b>${done ? " ✅" : ""}</div>
        <div>${who ? esc(who) + " • " : ""}${last}</div>
      </div>
      <div class="track"><div class="fill ${pctClass(p)}" style="width:${p}%"></div></div>
    </div>
  `;
}

function epubBits(it){
  if (!it.epub_has_meta) return "";
  const parts = [];
  if (it.epub_series){
    const sidx = it.epub_series_index ? ` #${esc(it.epub_series_index)}` : "";
    parts.push(badge("accent", "Series: " + esc(it.epub_series) + sidx));
  }
  if (it.epub_language) parts.push(badge("", "Lang: " + esc(it.epub_language)));
  if (it.epub_publisher) parts.push(badge("", esc(it.epub_publisher)));
  if (it.epub_date) parts.push(badge("", esc(it.epub_date)));
  if (Array.isArray(it.epub_subjects) && it.epub_subjects.length){
    parts.push(badge("warn", "Tags: " + esc(it.epub_subjects.slice(0,3).join(", "))));
  }
  if (Array.isArray(it.epub_identifiers) && it.epub_identifiers.length){
    parts.push(badge("", "ID: " + esc(it.epub_identifiers[0])));
  }
  return parts.length ? `<div class="line">${parts.join(" ")}</div>` : "";
}

function fileBits(it){
  const fmt = it.ext ? it.ext.toUpperCase() : "FILE";
  const coverB = it.has_cover ? badge("good","Cover") : badge("","No cover");
  const sizeB = it.size_human ? badge("", it.size_human) : "";
  const folderB = it.folder ? badge("", it.folder) : "";
  const modB = it.mtime_iso ? badge("", "Modified: " + it.mtime_iso) : "";
  return `<div class="line">${badge("accent", fmt)} ${coverB} ${sizeB} ${folderB} ${modB}</div>`;
}

function bookCardHTML(it){
  const title = it.display_title || it.name || "";
  const author = it.display_author || "";
  const desc = (it.epub_description || "").trim();
  return `
    <div class="bookcard">
      <img class="cover" src="/api/cover/${esc(it.md5)}" />
      <div class="meta">
        <div class="title" title="${esc(title)}">${esc(title)}</div>
        ${author ? `<div class="author" title="${esc(author)}">${esc(author)}</div>` : ``}
        ${fileBits(it)}
        ${epubBits(it)}
        ${desc ? `<div class="desc">${esc(desc)}</div>` : ``}
      </div>
      ${progressRow(it)}
    </div>
  `;
}

async function loadStats(){
  const r = await fetch("/api/stats");
  const s = await r.json();

  document.getElementById("statsHint").textContent =
    s.last_activity_iso ? `Last activity ${s.last_activity_age} ago` : "No activity yet";

  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="k">Active books</div><div class="v">${s.active_books}</div><div class="s">Unique books with progress</div></div>
    <div class="kpi"><div class="k">Average progress</div><div class="v">${s.avg_progress||0}%</div><div class="s">Across active books</div></div>
    <div class="kpi"><div class="k">Completed</div><div class="v">${s.completed}</div><div class="s">≥ 99.5%</div></div>
    <div class="kpi"><div class="k">Users</div><div class="v">${s.users}</div><div class="s">Seen in state folder</div></div>
  `;

  // Recent activity as fancy cards
  const recentGrid = document.getElementById("recentGrid");
  recentGrid.innerHTML = "";
  (s.top_recent || []).slice(0,6).forEach(it => {
    const wrap = document.createElement("div");
    wrap.innerHTML = bookCardHTML(it);
    recentGrid.appendChild(wrap.firstElementChild);
  });

  // Top users list (compact)
  const usersEl = document.getElementById("userList");
  usersEl.innerHTML = "";
  (s.users_breakdown || []).slice(0,8).forEach(u => {
    const d = document.createElement("div");
    d.style.padding = "10px 12px";
    d.style.border = "1px solid rgba(255,255,255,.08)";
    d.style.borderRadius = "16px";
    d.style.background = "rgba(255,255,255,.03)";
    d.style.marginBottom = "8px";
    const devs = (u.devices || []).slice(0,3).join(", ");
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
        <div style="font-weight:750">${esc(u.user)}</div>
        <div style="color:rgba(156,163,175,.9);font-size:12px">${esc(u.last_iso || "")}</div>
      </div>
      <div style="margin-top:4px;color:rgba(156,163,175,.9);font-size:12px">
        Books: <b style="color:rgba(229,231,235,.92)">${u.books||0}</b>
        ${devs ? " • Devices: " + esc(devs) : ""}
      </div>
    `;
    usersEl.appendChild(d);
  });
}

async function loadSearch(){
  const q = document.getElementById("q").value.trim();
  const out = document.getElementById("searchOut");
  if (!q){
    out.innerHTML = "";
    document.getElementById("searchHint").textContent = "Type to search";
    document.getElementById("searchEmpty").textContent = "";
    return;
  }

  const params = new URLSearchParams({q});
  if (state.filter==="epub") params.set("ext","epub");
  if (state.filter==="pdf") params.set("ext","pdf");
  if (state.filter==="cover") params.set("cover","1");
  if (state.filter==="recent") params.set("recent","1");

  const r = await fetch("/api/search?" + params);
  const j = await r.json();

  out.innerHTML = "";
  document.getElementById("searchHint").textContent = `${j.length} result(s)`;
  document.getElementById("searchEmpty").textContent =
    j.length ? "" : "No matches. Try a shorter query (or clear filters).";

  j.forEach(it => {
    const wrap = document.createElement("div");
    wrap.innerHTML = bookCardHTML(it);
    out.appendChild(wrap.firstElementChild);
  });
}

document.getElementById("q").addEventListener("input", loadSearch);
renderChips();
loadStats();
loadSearch();
setInterval(loadStats, 4000);
</script>
</body>
</html>
'''

# ---------------------------
# HTTP Handlers
# ---------------------------
class DashHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): return

    def _send(self, ctype, body):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = urlparse(self.path)
        qs = parse_qs(p.query)

        if p.path == "/":
            return self._send("text/html; charset=utf-8", dashboard_html().encode("utf-8"))

        if p.path == "/api/stats":
            return self._send("application/json; charset=utf-8",
                              json.dumps(AGG_STATS, ensure_ascii=False).encode("utf-8"))

        if p.path == "/api/search":
            q = (qs.get("q") or [""])[0]
            ext = (qs.get("ext") or [""])[0].lower().strip() or None
            only_cover = (qs.get("cover") or ["0"])[0] == "1"
            only_recent = (qs.get("recent") or ["0"])[0] == "1"
            out = search(q, 50, f_ext=ext, only_cover=only_cover, only_recent=only_recent)
            return self._send("application/json; charset=utf-8",
                              json.dumps(out, ensure_ascii=False).encode("utf-8"))

        if p.path.startswith("/api/cover/"):
            md5 = p.path.split("/")[-1]
            mime, data = read_cover_bytes(md5)
            if mime and data:
                return self._send(mime, data)
            return self._send("image/svg+xml", PLACEHOLDER_SVG)

        self.send_response(404)
        self.end_headers()

# TODO: Paste your full original SyncHandler class here (do_GET, do_POST, do_PUT, authorize, etc.)
# It was working before, so keep it unchanged.
class SyncHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): return
    # ... your full SyncHandler code from the original file ...

# Start servers
def start_dashboard():
    log("DASH", "Dashboard on http://localhost:7300")
    ThreadingHTTPServer(("0.0.0.0", 7300), DashHandler).serve_forever()

def start_sync():
    log("SYNC", f"Progress sync on http://0.0.0.0:{SYNC_PORT}")
    ThreadingHTTPServer(("0.0.0.0", SYNC_PORT), SyncHandler).serve_forever()

threading.Thread(target=start_dashboard, daemon=True).start()
threading.Thread(target=start_sync, daemon=True).start()

while True:
    time.sleep(3600)
'@

# Write with guaranteed UTF-8 without BOM
$Tmp = Join-Path $AppDir "launch_koreader_sync_compat.py"
Write-Host "[PS] Writing Python launcher with strict UTF-8 (no BOM)..."

$Utf8NoBom = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText(
    $Tmp,
    $Launcher.Replace("**PORT**", "$Port").Replace("**CACHE**", $Cache),
    $Utf8NoBom
)

Write-Host "[PS] Starting servers..." -ForegroundColor Green
& $Python $Tmp