import { Router } from "express";
import authGuard from "../middleware/authGuard";
import {
  acceptWorkspaceInvite,
  createWorkspace,
  createWorkspaceInvite,
  listWorkspaceMembers,
  listWorkspaces
} from "../controllers/workspaceController";

const workspaceRouter = Router();

workspaceRouter.use(authGuard);
workspaceRouter.get("/", listWorkspaces);
workspaceRouter.post("/", createWorkspace);
workspaceRouter.get("/:workspaceId/members", listWorkspaceMembers);
workspaceRouter.post("/:workspaceId/invites", createWorkspaceInvite);
workspaceRouter.post("/invites/accept", acceptWorkspaceInvite);

export default workspaceRouter;

