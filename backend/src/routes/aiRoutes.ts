import { Router } from "express";
import rateLimit from "express-rate-limit";
import authGuard from "../middleware/authGuard";
import { chatWithAssistant, listAssistantMessages } from "../controllers/aiController";

const aiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

aiRouter.get("/messages", authGuard, listAssistantMessages);
aiRouter.post("/chat", aiLimiter, authGuard, chatWithAssistant);

export default aiRouter;
