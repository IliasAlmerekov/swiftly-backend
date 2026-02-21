import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { assertUserRepositoryPort } from "../../ports/UserRepositoryPort.js";
import { isSupportUser } from "../lib/access.js";
import { forbiddenError, notFoundError, badRequestError } from "../lib/errors.js";

export const createTriageTicketUseCase = ({ ticketRepository, userRepository }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);
  const userRepositoryPort = assertUserRepositoryPort(userRepository);

  return async ({ ticketId, triageData, user }) => {
    if (!isSupportUser(user)) {
      throw forbiddenError("Access denied");
    }

    const ticket = await ticketRepositoryPort.findById(ticketId);
    if (!ticket) {
      throw notFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    const { priority, category, status, assignedTo } = triageData;
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (status) ticket.status = status;
    if (assignedTo) {
      const assignee = await userRepositoryPort.findSupportUserById(assignedTo);
      if (!assignee) {
        throw badRequestError(
          "Assigned user must be support or admin",
          "INVALID_ASSIGNEE"
        );
      }
      ticket.assignedTo = assignedTo;
    }

    await ticketRepositoryPort.save(ticket);
    return ticketRepositoryPort.findByIdPopulated(ticketId);
  };
};
