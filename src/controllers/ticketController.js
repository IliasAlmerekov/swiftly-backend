// Controller zum Abrufen aller Tickets (für Admin)
// Gibt alle Tickets mit User-Info (owner) zurück
export const getAllTickets = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    // Finde alle Tickets und fülle das owner-Feld mit User-Daten
    const tickets = await Ticket.find()
      .populate("owner", "email name role")
      .populate("comments.author", "email name role");
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({
      message: "Tickets konnten nicht geladen werden",
      error: error.message,
    });
  }
};

// Controller zum Abrufen aller Tickets des angemeldeten Benutzers
export const getUserTickets = async (req, res) => {
  try {
    // Finde alle Tickets des angemeldeten Benutzers
    const tickets = await Ticket.find({ owner: req.user._id })
      .populate("owner", "email name role")
      .populate("comments.author", "email name role"); // Füge Benutzerinformationen hinzu
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({
      message: "Benutzer-Tickets konnten nicht geladen werden",
      error: error.message,
    });
  }
};

// Importiere das Ticket-Modell
import Ticket from "../models/ticketModel.js";

// Controller zum Hinzufügen eines Kommentars zu einem Ticket
export const addComment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Add the comment to the ticket
    ticket.comments.push({
      content,
      author: req.user._id,
    });

    // Save the ticket with the new comment
    await ticket.save();

    // Fetch the updated ticket with populated comments
    const updatedTicket = await Ticket.findById(ticketId)
      .populate("owner", "name email")
      .populate("comments.author", "name email");

    res.status(201).json(updatedTicket);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

// Controller zum Abrufen eines einzelnen Tickets mit Kommentaren
export const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate("owner", "name email")
      .populate("assignedTo", "name email role")
      .populate("comments.author", "name email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve ticket",
      error: error.message,
    });
  }
};

// Controller zum Erstellen eines neuen Tickets
// Diese Funktion wird aufgerufen, wenn ein User ein Ticket erstellt
// Der User muss authentifiziert sein (authMiddleware)
export const createTicket = async (req, res) => {
  try {
    // Hole die Felder aus dem Request-Body
    const { title, description, priority } = req.body;

    // Erstelle ein neues Ticket in der Datenbank
    // owner wird aus req.user._id gesetzt
    const ticket = await Ticket.create({
      title,
      description,
      priority,
      owner: req.user._id, // User-Referenz
      status: "open",
    });

    // Sende das erstellte Ticket als Antwort zurück
    res.status(201).json(ticket);
  } catch (error) {
    // Fehlerbehandlung: Sende eine Fehlermeldung zurück
    res.status(400).json({
      message: "Ticket konnte nicht erstellt werden",
      error: error.message,
    });
  }
};

// Controller zum Aktualisieren eines Tickets
export const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, assignedTo } = req.body;

    // Finde das Ticket
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Nur Admins dürfen Tickets aktualisieren
    if (
      req.user.role !== "admin" &&
      req.user._id.toString() !== ticket.owner.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this ticket" });
    }

    // Aktualisiere die Felder
    if (status) {
      ticket.status = status;
    }

    if (assignedTo) {
      ticket.assignedTo = assignedTo;
    }

    const { title, description, priority } = req.body;

    if (title) {
      ticket.title = title;
    }

    if (description) {
      ticket.description = description;
    }

    if (priority) {
      ticket.priority = priority;
    }

    // Speichere das aktualisierte Ticket
    await ticket.save();

    // Lade das aktualisierte Ticket mit Benutzerinformationen
    const updatedTicket = await Ticket.findById(ticketId)
      .populate("owner", "name email")
      .populate("assignedTo", "name email role")
      .populate("comments.author", "name email");

    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};
