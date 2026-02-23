import express from "express";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { requireTicketOwnerOrRole } from "../middlewares/ticketOwnershipMiddleware.js";
import ticketUpload from "../middlewares/ticketUploadMiddleware.js";

export const createTicketRoutes = ({ ticketController, authMiddleware }) => {
  const router = express.Router();

  router.get("/", authMiddleware, ticketController.listTickets);
  router.get(
    "/user/stats",
    authMiddleware,
    ticketController.getUserTicketStats
  );
  router.get("/stats", authMiddleware, ticketController.getTicketStats);

  router.get(
    "/:ticketId",
    authMiddleware,
    requireTicketOwnerOrRole(["support1", "admin"]),
    ticketController.getTicketById
  );

  router.post("/", authMiddleware, ticketController.createTicket);

  router.post(
    "/:ticketId/comments",
    authMiddleware,
    requireTicketOwnerOrRole(["support1", "admin"]),
    ticketController.addComment
  );

  router.post(
    "/:ticketId/attachments",
    authMiddleware,
    requireTicketOwnerOrRole(["support1", "admin"]),
    ticketUpload.single("file"),
    ticketController.uploadTicketAttachment
  );

  router.put(
    "/:ticketId",
    authMiddleware,
    requireTicketOwnerOrRole(["support1", "admin"]),
    ticketController.updateTicket
  );

  router.put(
    "/:ticketId/triage",
    authMiddleware,
    requireRole(["support1", "admin"]),
    ticketController.triageTicket
  );

  return router;
};
