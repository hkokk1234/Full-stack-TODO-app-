import { Router } from "express";
import multer from "multer";
import { createTask, deleteTask, listTasks, updateTask } from "../controllers/taskController";
import { deleteTaskAttachment, uploadTaskAttachment } from "../controllers/taskAttachmentController";
import { exportTasks, importTasks } from "../controllers/taskTransferController";
import { listTaskShares, removeTaskShare, shareTaskWithUser } from "../controllers/taskShareController";
import {
  assignTaskToMe,
  createTaskComment,
  listTaskActivity,
  listTaskComments,
  unassignTaskFromMe
} from "../controllers/taskCollabController";
import authGuard from "../middleware/authGuard";

const taskRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

taskRouter.use(authGuard);
taskRouter.get("/", listTasks);
taskRouter.get("/export", exportTasks);
taskRouter.post("/import", upload.single("file"), importTasks);
taskRouter.post("/", createTask);
taskRouter.put("/:id", updateTask);
taskRouter.delete("/:id", deleteTask);

taskRouter.get("/:id/comments", listTaskComments);
taskRouter.post("/:id/comments", createTaskComment);
taskRouter.get("/:id/activity", listTaskActivity);
taskRouter.post("/:id/assign-me", assignTaskToMe);
taskRouter.delete("/:id/assign-me", unassignTaskFromMe);
taskRouter.get("/:id/shares", listTaskShares);
taskRouter.post("/:id/shares", shareTaskWithUser);
taskRouter.delete("/:id/shares/:memberUserId", removeTaskShare);
taskRouter.post("/:id/attachments", upload.single("file"), uploadTaskAttachment);
taskRouter.delete("/:id/attachments/:attachmentId", deleteTaskAttachment);

export default taskRouter;
