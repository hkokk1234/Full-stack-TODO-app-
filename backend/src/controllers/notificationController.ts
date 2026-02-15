import mongoose from "mongoose";
import type { Request, Response } from "express";
import Notification from "../models/Notification";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { listNotificationsSchema, updateNotificationPreferencesSchema } from "../validators.notification";
import { emitNotificationRealtime } from "../realtime/events";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const query = listNotificationsSchema.parse(req.query);
  const limit = query.limit ?? 30;
  const unreadOnly = query.unreadOnly === "true";

  const filter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
  if (unreadOnly) filter.readAt = null;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), readAt: null })
  ]);

  return res.status(200).json({ items, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid notification id" });

  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();

  if (!updated) return res.status(404).json({ message: "Notification not found" });
  emitNotificationRealtime({
    type: "notification.read",
    userId,
    notificationId: String(updated._id)
  });
  return res.status(200).json(updated);
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  await Notification.updateMany({ userId: new mongoose.Types.ObjectId(userId), readAt: null }, { $set: { readAt: new Date() } });
  emitNotificationRealtime({
    type: "notification.read_all",
    userId
  });
  return res.status(204).send();
});

export const getNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findById(userId).select("notificationPreferences").lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.status(200).json({ notificationPreferences: user.notificationPreferences });
});

export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const payload = updateNotificationPreferencesSchema.parse(req.body);
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...payload
  };
  await user.save();

  return res.status(200).json({ notificationPreferences: user.notificationPreferences });
});

export const unsubscribeAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.notificationPreferences = {
    ...user.notificationPreferences,
    unsubscribedAll: true,
    emailDueSoon: false
  };
  await user.save();

  return res.status(200).json({ notificationPreferences: user.notificationPreferences });
});
