// Controller zum Abrufen aller Tickets (für Admin)
// Gibt alle Tickets mit User-Info (owner) zurück
export const getAllTickets = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    // Finde alle Tickets und fülle das owner-Feld mit User-Daten
    const tickets = await Ticket.find()
      .populate("owner", "email name role avatar")
      .populate("assignedTo", "email name role avatar")
      .populate("comments.author", "email name role avatar");
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({
      message: "Tickets konnten nicht geladen werden",
      error: error.message,
    });
  }
};

export const getTicketsToday = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ticketsToday = await Ticket.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    res.status(200).json({ ticketsToday });
  } catch (error) {
    res.status(500).json({
      message: "Tickets today could not be retrieved",
      error: error.message,
    });
  }
}

// Controller zum Abrufen aller Tickets des angemeldeten Benutzers
export const getUserTickets = async (req, res) => {
  try {
    // Finde alle Tickets des angemeldeten Benutzers
    const tickets = await Ticket.find({ owner: req.user._id })
      .populate("owner", "email name role avatar")
      .populate("assignedTo", "email name role avatar")
      .populate("comments.author", "email name role avatar"); // Füge Benutzerinformationen hinzu
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
      .populate("owner", "name email avatar")
      .populate("comments.author", "name email avatar");

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
      .populate("owner", "name email avatar")
      .populate("assignedTo", "name email role avatar")
      .populate("comments.author", "name email avatar");

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
      avatar: req.user.avatar // Avatar des Ticket-Erstellers
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

// Controller for getting ticket statistics by month
export const getTicketStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = January, 11 = December)
    
    const stats = [];
    
    // Loop through each month from January to the current month
    for (let month = 0; month <= currentMonth; month++) {
      const startDate = new Date(currentYear, month, 1); // First day of the month
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999); // Last day of the month

      const count = await Ticket.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      stats.push({
        month: monthNames[month],
        monthNumber: month + 1,
        count: count,
        year: currentYear
      });
    }
    
    res.status(200).json({
      stats,
      currentMonth: currentMonth + 1,
      currentYear: currentYear
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve ticket statistics",
      error: error.message,
    });
  }
};

export const getUserTicketStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = January, 11 = December)
    
    const stats = [];
    
    // Calculate the start month (6 months ago)
    let startMonth = currentMonth - 5; // 6 months including current month
    let yearOffset = 0;
    
    if (startMonth < 0) {
      yearOffset = -1;
      startMonth = 12 + startMonth; // Convert negative to positive month in previous year
    }
    
    // Loop through the last 6 months
    for (let i = 0; i < 6; i++) {
      let month = startMonth + i;
      let year = currentYear + yearOffset;
      
      // Handle year transition
      if (month >= 12) {
        month = month - 12;
        year = currentYear;
      }
      
      const startDate = new Date(year, month, 1); // First day of the month
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of the month

      const count = await Ticket.countDocuments({
        owner: req.user._id, // Filter by current user
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      stats.push({
        month: monthNames[month],
        monthNumber: month + 1,
        count: count,
        year: year
      });
    }
    
    res.status(200).json({
      stats,
      period: 'Last 6 months',
      userId: req.user._id
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve user ticket statistics",
      error: error.message,
    });
  }
}
