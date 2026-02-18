import Ticket from "../models/ticketModel.js";

const requireTicketOwnerOrRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (roles.includes(req.user.role)) {
        return next();
      }

      const { ticketId } = req.params;
      const ticket = await Ticket.findById(ticketId).select("owner");
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export { requireTicketOwnerOrRole };
