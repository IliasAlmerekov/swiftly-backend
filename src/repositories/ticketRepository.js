class TicketRepository {
  constructor({ Ticket }) {
    this.Ticket = Ticket;
  }

  findFilteredPopulated({ filter = {}, cursor = null, limit = 50 } = {}) {
    const cursorFilter = buildCursorFilter(cursor);
    const combinedFilter = mergeFilters(filter, cursorFilter);

    return this.Ticket.find(combinedFilter)
      .populate("owner", "email name role avatar")
      .populate("assignedTo", "email name role avatar")
      .populate("comments.author", "email name role avatar")
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);
  }

  findAllPopulated({ cursor = null, limit = 50 } = {}) {
    return this.findFilteredPopulated({ cursor, limit });
  }

  findByOwnerPopulated(ownerId, { cursor = null, limit = 50 } = {}) {
    return this.findFilteredPopulated({
      filter: { owner: ownerId },
      cursor,
      limit,
    });
  }

  findByIdPopulated(ticketId) {
    return this.Ticket.findById(ticketId)
      .populate("owner", "name email avatar position")
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

const buildCursorFilter = cursor => {
  if (!cursor) return {};
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ],
  };
};

const mergeFilters = (baseFilter, cursorFilter) => {
  const hasBase = baseFilter && Object.keys(baseFilter).length > 0;
  const hasCursor = cursorFilter && Object.keys(cursorFilter).length > 0;

  if (hasBase && hasCursor) {
    return { $and: [baseFilter, cursorFilter] };
  }
  if (hasBase) return baseFilter;
  if (hasCursor) return cursorFilter;
  return {};
};

export default TicketRepository;
