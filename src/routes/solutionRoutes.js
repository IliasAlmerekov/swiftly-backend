import express from "express";
import { requireRole } from "../middlewares/roleMiddleware.js";

export const createSolutionRoutes = ({
  solutionController,
  authMiddleware,
}) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.get("/", solutionController.getAllSolutions);
  router.get("/search", solutionController.searchSolutions);
  router.get(
    "/stats",
    requireRole(["support1", "admin"]),
    solutionController.getSolutionStats
  );
  router.get("/:id", solutionController.getSolutionById);
  router.post(
    "/",
    requireRole(["support1", "admin"]),
    solutionController.createSolution
  );
  router.put(
    "/:id",
    requireRole(["support1", "admin"]),
    solutionController.updateSolution
  );
  router.delete(
    "/:id",
    requireRole(["support1", "admin"]),
    solutionController.deleteSolution
  );

  return router;
};
