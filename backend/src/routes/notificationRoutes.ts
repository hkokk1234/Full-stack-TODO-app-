import { Router } from "express";
import authGuard from "../middleware/authGuard";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unsubscribeAllNotifications,
  updateNotificationPreferences
} from "../controllers/notificationController";

const notificationRouter = Router();

notificationRouter.use(authGuard);
notificationRouter.get("/", listNotifications);
notificationRouter.post("/read-all", markAllNotificationsRead);
notificationRouter.post("/:id/read", markNotificationRead);
notificationRouter.get("/preferences", getNotificationPreferences);
notificationRouter.put("/preferences", updateNotificationPreferences);
notificationRouter.post("/unsubscribe-all", unsubscribeAllNotifications);

export default notificationRouter;
