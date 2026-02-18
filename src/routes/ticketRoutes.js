import express from "express";
import { createTicketController } from "../controllers/ticketController.js";
import container from "../container.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { requireTicketOwnerOrRole } from "../middlewares/ticketOwnershipMiddleware.js";
import ticketUpload from "../middlewares/ticketUploadMiddleware.js";

const router = express.Router();
const ticketController = createTicketController(container);

// Route zum Abrufen von Tickets mit Filtern
// GET /api/tickets
router.get("/", authMiddleware, ticketController.listTickets);

// Route zum Abrufen der Ticket-Statistiken des angemeldeten Benutzers
// GET /api/tickets/stats
router.get("/user/stats", authMiddleware, ticketController.getUserTicketStats);

// Route zum Abrufen der Ticket-Statistiken
router.get("/stats", authMiddleware, ticketController.getTicketStats);

// Route zum Abrufen eines einzelnen Tickets mit Kommentaren
// GET /api/tickets/:ticketId
router.get(
  "/:ticketId",
  authMiddleware,
  requireTicketOwnerOrRole(["support1", "admin"]),
  ticketController.getTicketById
);

// Route zum Erstellen eines neuen Tickets
// Nur für authentifizierte Benutzer
// POST /api/tickets
router.post("/", authMiddleware, ticketController.createTicket);

// Route zum Hinzufügen eines Kommentars zu einem Ticket
// POST /api/tickets/:ticketId/comments
router.post(
  "/:ticketId/comments",
  authMiddleware,
  requireTicketOwnerOrRole(["support1", "admin"]),
  ticketController.addComment
);

// Upload attachment
router.post(
  "/:ticketId/attachments",
  authMiddleware,
  requireTicketOwnerOrRole(["support1", "admin"]),
  ticketUpload.single("file"),
  ticketController.uploadTicketAttachment
);

// Route zum Aktualisieren eines Tickets (Status, Zuweisung)
// PUT /api/tickets/:ticketId
router.put(
  "/:ticketId",
  authMiddleware,
  requireTicketOwnerOrRole(["support1", "admin"]),
  ticketController.updateTicket
);

// Triage route for support1/admin
router.put(
  "/:ticketId/triage",
  authMiddleware,
  requireRole(["support1", "admin"]),
  ticketController.triageTicket
);

export default router;
