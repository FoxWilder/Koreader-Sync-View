import { Router, type IRouter } from "express";
import { UpdateSettingsBody } from "@workspace/api-zod";
import {
  getSettings,
  updateLibraryPath,
  triggerScan,
  triggerRebuild,
  getScanStatus,
} from "../lib/koreader-settings";

const router: IRouter = Router();

// GET /api/koreader/settings
router.get("/koreader/settings", async (_req, res): Promise<void> => {
  res.json(getSettings());
});

// PUT /api/koreader/settings
router.put("/koreader/settings", async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const settings = updateLibraryPath(body.data.library_path);
  res.json(settings);
});

// POST /api/koreader/settings/scan
router.post("/koreader/settings/scan", async (_req, res): Promise<void> => {
  const status = triggerScan();
  res.json(status);
});

// GET /api/koreader/settings/scan/status
router.get("/koreader/settings/scan/status", async (_req, res): Promise<void> => {
  res.json(getScanStatus());
});

// POST /api/koreader/settings/rebuild
// Clears the existing cache then runs a full scan from scratch.
router.post("/koreader/settings/rebuild", async (_req, res): Promise<void> => {
  const status = triggerRebuild();
  res.json(status);
});

export default router;
