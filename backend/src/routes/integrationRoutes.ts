import { Router } from "express";
import authGuard from "../middleware/authGuard";
import { microsoftImportTasks, microsoftLists, microsoftListTasks } from "../controllers/integrationController";

const integrationRouter = Router();

integrationRouter.use(authGuard);
integrationRouter.post("/microsoft/lists", microsoftLists);
integrationRouter.post("/microsoft/lists/:listId/tasks", microsoftListTasks);
integrationRouter.post("/microsoft/import", microsoftImportTasks);

export default integrationRouter;
