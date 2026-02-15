import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import openApiV1 from "../docs/openapiV1";

const docsRouter = Router();

docsRouter.get("/openapi.json", (_req, res) => {
  res.status(200).json(openApiV1);
});

docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiV1));

export default docsRouter;

