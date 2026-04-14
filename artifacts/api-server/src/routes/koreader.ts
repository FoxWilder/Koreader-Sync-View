import { Router, type IRouter } from "express";
import {
  SearchLibraryQueryParams,
  GetCoverParams,
  GetSyncProgressParams,
  UpdateSyncProgressParams,
  UpdateSyncProgressBody,
  GetAuthParams,
} from "@workspace/api-zod";
import {
  getStats,
  searchLibrary,
  readCoverBytes,
  getSyncRecord,
  upsertSyncRecord,
  getOrCreateUser,
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

  const { q, ext, cover, recent } = parsed.data;
  const results = searchLibrary(q, {
    ext: ext || undefined,
    onlyCover: cover === "1",
    onlyRecent: recent === "1",
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

// GET /api/koreader/syncs/:username/:document
router.get("/koreader/syncs/:username/:document", async (req, res): Promise<void> => {
  const params = GetSyncProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const record = getSyncRecord(params.data.username, params.data.document);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(record);
});

// PUT /api/koreader/syncs/:username/:document
router.put("/koreader/syncs/:username/:document", async (req, res): Promise<void> => {
  const params = UpdateSyncProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSyncProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const record = upsertSyncRecord(params.data.username, params.data.document, body.data);
  res.json(record);
});

// GET /api/koreader/users/:username/auth
router.get("/koreader/users/:username/auth", async (req, res): Promise<void> => {
  const params = GetAuthParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const auth = getOrCreateUser(params.data.username);
  res.json(auth);
});

export default router;
