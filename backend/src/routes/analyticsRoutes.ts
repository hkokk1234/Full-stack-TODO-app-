import { Router } from "express";
import authGuard from "../middleware/authGuard";
import { analyticsSummary } from "../controllers/analyticsController";

const analyticsRouter = Router();

analyticsRouter.use(authGuard);
analyticsRouter.get("/summary", analyticsSummary);

export default analyticsRouter;
