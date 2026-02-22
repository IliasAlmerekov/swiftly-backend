import { createTicketUseCases } from "../application/tickets/use-cases/index.js";

class TicketService {
  constructor({ ticketRepository, userRepository, fileStorage, clock }) {
    this.ticketRepository = ticketRepository;
    this.useCases = createTicketUseCases({
      ticketRepository,
      userRepository,
      fileStorage,
      clock,
    });
  }

  async listTickets(user, query = {}) {
    return this.useCases.listTickets({ user, query });
  }

  async getTicketById(ticketId, user) {
    return this.useCases.getTicketById({ ticketId, user });
  }

  async addComment(ticketId, content, user) {
    return this.useCases.addComment({ ticketId, content, user });
  }

  async createTicket({ title, description, user }) {
    return this.useCases.createTicket({ title, description, user });
  }

  async updateTicket(ticketId, updateData, user) {
    return this.useCases.updateTicket({ ticketId, updateData, user });
  }

  async triageTicket(ticketId, triageData, user) {
    return this.useCases.triageTicket({ ticketId, triageData, user });
  }

  async uploadAttachment(ticketId, file, user) {
    return this.useCases.uploadAttachment({ ticketId, file, user });
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
    for (let month = 0; month <= currentMonth; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);
      const count = await this.ticketRepository.countByDateRange(
        startDate,
        endDate
      );
      stats.push({
        month: getMonthName(month),
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
        month: getMonthName(month),
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
}

const MONTH_NAMES = new Map([
  [0, "January"],
  [1, "February"],
  [2, "March"],
  [3, "April"],
  [4, "May"],
  [5, "June"],
  [6, "July"],
  [7, "August"],
  [8, "September"],
  [9, "October"],
  [10, "November"],
  [11, "December"],
]);

const getMonthName = month => MONTH_NAMES.get(month) ?? "Unknown";

export default TicketService;
