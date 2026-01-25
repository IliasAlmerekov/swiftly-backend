class TicketService {
  constructor({ ticketRepository, userRepository, cloudinary, fs }) {
    this.ticketRepository = ticketRepository;
    this.userRepository = userRepository;
    this.cloudinary = cloudinary;
    this.fs = fs;
  }

  async getAllTickets(user, query = {}) {
    if (!["support1", "admin"].includes(user.role)) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    return this.ticketRepository.findAllPopulated({ skip, limit });
  }

  async getUserTickets(user, query = {}) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    return this.ticketRepository.findByOwnerPopulated(user._id, { skip, limit });
  }

  async getTicketById(ticketId, user) {
    const ticket = await this.ticketRepository.findByIdPopulated(ticketId);
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }
    const ownerId = ticket.owner?._id ? ticket.owner._id : ticket.owner;
    const isOwner = ownerId && user._id.toString() === ownerId.toString();
    const isSupport = ["support1", "admin"].includes(user.role);
    if (!isOwner && !isSupport) {
      const error = new Error("Not authorized to view this ticket");
      error.status = 403;
      throw error;
    }
    return ticket;
  }

  async addComment(ticketId, content, user) {
    if (!content) {
      const error = new Error("Comment content is required");
      error.status = 400;
      throw error;
    }
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }
    const isOwner = user._id.toString() === ticket.owner.toString();
    const isSupport = ["support1", "admin"].includes(user.role);
    if (!isOwner && !isSupport) {
      const error = new Error("Not authorized to comment on this ticket");
      error.status = 403;
      throw error;
    }

    ticket.comments.push({ content, author: user._id });
    await this.ticketRepository.save(ticket);
    return this.ticketRepository.findByIdPopulated(ticketId);
  }

  async createTicket({ title, description, user }) {
    return this.ticketRepository.create({
      title,
      description,
      owner: user._id,
      status: "open",
    });
  }

  async updateTicket(ticketId, updateData, user) {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }

    const isOwner = user._id.toString() === ticket.owner.toString();
    const isSupport = ["support1", "admin"].includes(user.role);
    if (!isOwner && !isSupport) {
      const error = new Error("Not authorized to update this ticket");
      error.status = 403;
      throw error;
    }

    const { status, assignedTo, title, description, priority, category } = updateData;

    if (isSupport) {
      if (status) ticket.status = status;
      if (assignedTo) {
        const assignee = await this.userRepository.findSupportUserById(assignedTo);
        if (!assignee) {
          const error = new Error("Assigned user must be support or admin");
          error.status = 400;
          throw error;
        }
        ticket.assignedTo = assignedTo;
      }
    }
    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority && isSupport) ticket.priority = priority;
    if (category && isSupport) ticket.category = category;

    await this.ticketRepository.save(ticket);
    return this.ticketRepository.findByIdPopulated(ticketId);
  }

  async triageTicket(ticketId, triageData, user) {
    if (!["support1", "admin"].includes(user.role)) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }

    const { priority, category, status, assignedTo } = triageData;
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (status) ticket.status = status;
    if (assignedTo) {
      const assignee = await this.userRepository.findSupportUserById(assignedTo);
      if (!assignee) {
        const error = new Error("Assigned user must be support or admin");
        error.status = 400;
        throw error;
      }
      ticket.assignedTo = assignedTo;
    }

    await this.ticketRepository.save(ticket);
    return this.ticketRepository.findByIdPopulated(ticketId);
  }

  async getTicketsToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return this.ticketRepository.countByDateRange(startOfDay, endOfDay);
  }

  async getTicketStats() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const stats = [];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    for (let month = 0; month <= currentMonth; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);
      const count = await this.ticketRepository.countByDateRange(startDate, endDate);
      stats.push({
        month: monthNames[month],
        monthNumber: month + 1,
        count,
        year: currentYear,
      });
    }

    return {
      stats,
      currentMonth: currentMonth + 1,
      currentYear,
    };
  }

  async getUserTicketStats(user) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const stats = [];
    let startMonth = currentMonth - 5;
    let yearOffset = 0;
    if (startMonth < 0) {
      yearOffset = -1;
      startMonth = 12 + startMonth;
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    for (let i = 0; i < 6; i++) {
      let month = startMonth + i;
      let year = currentYear + yearOffset;
      if (month >= 12) {
        month -= 12;
        year = currentYear;
      }

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const count = await this.ticketRepository.countByOwnerAndDateRange(
        user._id,
        startDate,
        endDate
      );
      stats.push({
        month: monthNames[month],
        monthNumber: month + 1,
        count,
        year,
      });
    }

    return {
      stats,
      period: "Last 6 months",
      userId: user._id,
    };
  }

  async uploadAttachment(ticketId, file, user) {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      const error = new Error("Ticket not found");
      error.status = 404;
      throw error;
    }

    const isOwner = user._id.toString() === ticket.owner.toString();
    const isSupport = ["support1", "admin"].includes(user.role);
    if (!isOwner && !isSupport) {
      const error = new Error("Not authorized to add attachments");
      error.status = 403;
      throw error;
    }

    if (!file) {
      const error = new Error("No file uploaded");
      error.status = 400;
      throw error;
    }

    let result;
    try {
      result = await this.cloudinary.uploader.upload(file.path, {
        folder: "ticket-attachments",
        resource_type: "auto",
      });
    } finally {
      try {
        this.fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error("Error removing temporary file:", unlinkError);
      }
    }

    ticket.attachments.push({
      public_id: result.public_id,
      url: result.secure_url,
      mime: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    });

    await this.ticketRepository.save(ticket);
    return ticket.attachments;
  }
}

export default TicketService;
