import { Router, type IRouter } from "express";
import healthRouter from "./health";
import koreaderRouter from "./koreader";

const router: IRouter = Router();

router.use(healthRouter);
router.use(koreaderRouter);

export default router;
