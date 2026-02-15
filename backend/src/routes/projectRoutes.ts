import { Router } from "express";
import authGuard from "../middleware/authGuard";
import {
  addProjectMember,
  createProject,
  getProjectMembers,
  listProjects,
  removeProjectMember,
  updateProjectMemberRole
} from "../controllers/projectController";

const projectRouter = Router();

projectRouter.use(authGuard);
projectRouter.get("/", listProjects);
projectRouter.post("/", createProject);
projectRouter.get("/:projectId/members", getProjectMembers);
projectRouter.post("/:projectId/members", addProjectMember);
projectRouter.patch("/:projectId/members/:memberUserId", updateProjectMemberRole);
projectRouter.delete("/:projectId/members/:memberUserId", removeProjectMember);

export default projectRouter;
