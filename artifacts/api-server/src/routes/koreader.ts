import { Router, type IRouter } from "express";
import {
  SearchLibraryQueryParams,
  GetCoverParams,
  GetSyncProgressParams,
  UpdateSyncProgressBody,
  RegisterUserBody,
} from "@workspace/api-zod";
import {
  getStats,
  searchLibrary,
  readCoverBytes,
  getSyncRecord,
  upsertSyncRecord,
  getOrCreateUser,
  registerUser,
} from "../lib/koreader-store";

const router: IRouter = Router();

const PLACEHOLDER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='360'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='#1f2937'/><stop offset='1' stop-color='#0b0e14'/>
</linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
<rect x='18' y='18' width='204' height='324' rx='18' fill='rgba(255,255,255,0.06)' stroke='rgba(255,255,255,0.12)'/>
<text x='50%' y='48%' fill='rgba(255,255,255,0.7)' font-family='Segoe UI,system-ui' font-size='18' text-anchor='middle'>No cover</text>
<text x='50%' y='56%' fill='rgba(255,255,255,0.35)' font-family='Segoe UI,system-ui' font-size='12' text-anchor='middle'>KOReader</text>
</svg>`;

// GET /api/koreader/stats
router.get("/koreader/stats", async (_req, res): Promise<void> => {
  res.json(getStats());
});

// GET /api/koreader/search?q=...&ext=...&cover=1&recent=1
router.get("/koreader/search", async (req, res): Promise<void> => {
  const parsed = SearchLibraryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, ext, cover, recent, user, status, lang, sort } = parsed.data;
  const results = searchLibrary(q, {
    ext: ext || undefined,
    onlyCover: cover === "1",
    onlyRecent: recent === "1",
    user: user || undefined,
    status: status || undefined,
    lang: lang || undefined,
    sort: sort || undefined,
  });

  res.json(results);
});

// GET /api/koreader/cover/:md5
router.get("/koreader/cover/:md5", async (req, res): Promise<void> => {
  const params = GetCoverParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cover = readCoverBytes(params.data.md5);
  if (cover) {
    res.setHeader("Content-Type", cover.mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(cover.data);
    return;
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(PLACEHOLDER_SVG);
});

// POST /api/koreader/users/create — register a new user
router.post("/koreader/users/create", async (req, res): Promise<void> => {
  const body = RegisterUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Missing username or password" });
    return;
  }
  const result = registerUser(body.data.username, body.data.password);
  if (result.registered) {
    res.status(201).json({ message: "User registered" });
  } else {
    res.status(402).json({ message: "Username already registered" });
  }
});

// GET /api/koreader/users/auth — authenticate via x-auth-user / x-auth-key headers
router.get("/koreader/users/auth", async (req, res): Promise<void> => {
  const username = req.headers["x-auth-user"];
  const userkey  = req.headers["x-auth-key"];
  if (!username || !userkey || typeof username !== "string" || typeof userkey !== "string") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const auth = getOrCreateUser(username, userkey);
  if (!auth.authorized) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.json({ authorized: true, user: username });
});

// GET /api/koreader/syncs/progress/:document — get progress (auth via headers)
router.get("/koreader/syncs/progress/:document", async (req, res): Promise<void> => {
  const username = req.headers["x-auth-user"];
  const userkey  = req.headers["x-auth-key"];
  if (!username || typeof username !== "string" || typeof userkey !== "string") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const auth = getOrCreateUser(username, userkey as string);
  if (!auth.authorized) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const params = GetSyncProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Bad request" });
    return;
  }

  const record = getSyncRecord(username, params.data.document);
  if (!record) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.json(record);
});

// PUT /api/koreader/syncs/progress — update progress (auth via headers, document in body)
router.put("/koreader/syncs/progress", async (req, res): Promise<void> => {
  const username = req.headers["x-auth-user"];
  const userkey  = req.headers["x-auth-key"];
  if (!username || typeof username !== "string" || typeof userkey !== "string") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const auth = getOrCreateUser(username, userkey as string);
  if (!auth.authorized) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const body = UpdateSyncProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Bad request" });
    return;
  }

  const record = upsertSyncRecord(username, body.data.document, body.data);
  res.json(record);
});

export default router;
