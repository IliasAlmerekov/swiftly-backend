import express from "express";
import {
  createTicket,
  getAllTickets,
  getUserTickets,
  addComment,
  getTicketById,
  updateTicket,
} from "../controllers/ticketController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route zum Abrufen aller Tickets (Admin)
// GET /api/tickets
router.get("/", authMiddleware, getAllTickets);

// Route zum Abrufen der Tickets des angemeldeten Benutzers
// GET /api/tickets/user
router.get("/user", authMiddleware, getUserTickets);

// Route zum Abrufen eines einzelnen Tickets mit Kommentaren
// GET /api/tickets/:ticketId
router.get("/:ticketId", authMiddleware, getTicketById);

// Route zum Erstellen eines neuen Tickets
// Nur für authentifizierte Benutzer
// POST /api/tickets
router.post("/", authMiddleware, createTicket);

// Route zum Hinzufügen eines Kommentars zu einem Ticket
// POST /api/tickets/:ticketId/comments
router.post("/:ticketId/comments", authMiddleware, addComment);

// Route zum Aktualisieren eines Tickets (Status, Zuweisung)
// PUT /api/tickets/:ticketId
router.put("/:ticketId", authMiddleware, updateTicket);

export default router;
