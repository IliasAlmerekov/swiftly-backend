class TicketRepository {
  constructor({ Ticket }) {
    this.Ticket = Ticket;
  }

  findAllPopulated({ skip = 0, limit = 50 } = {}) {
    return this.Ticket.find()
      .populate("owner", "email name role avatar")
      .populate("assignedTo", "email name role avatar")
      .populate("comments.author", "email name role avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  findByOwnerPopulated(ownerId, { skip = 0, limit = 50 } = {}) {
    return this.Ticket.find({ owner: ownerId })
      .populate("owner", "email name role avatar")
      .populate("assignedTo", "email name role avatar")
      .populate("comments.author", "email name role avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  findByIdPopulated(ticketId) {
    return this.Ticket.findById(ticketId)
      .populate("owner", "name email avatar")
      .populate("assignedTo", "name email role avatar")
      .populate("comments.author", "name email avatar");
  }

  findById(ticketId) {
    return this.Ticket.findById(ticketId);
  }

  create(data) {
    return this.Ticket.create(data);
  }

  save(ticket) {
    return ticket.save();
  }

  countByDateRange(startDate, endDate) {
    return this.Ticket.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }

  countByOwnerAndDateRange(ownerId, startDate, endDate) {
    return this.Ticket.countDocuments({
      owner: ownerId,
      createdAt: { $gte: startDate, $lte: endDate },
    });
  }
}

export default TicketRepository;
