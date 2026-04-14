import { Router, type IRouter } from "express";
import healthRouter from "./health";
import koreaderRouter from "./koreader";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(koreaderRouter);
router.use(settingsRouter);

export default router;
