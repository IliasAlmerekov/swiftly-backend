import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { assertUserRepositoryPort } from "../../ports/UserRepositoryPort.js";
import { isSupportUser, isTicketOwner } from "../lib/access.js";
import { forbiddenError, notFoundError, badRequestError } from "../lib/errors.js";

export const createUpdateTicketUseCase = ({ ticketRepository, userRepository }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);
  const userRepositoryPort = assertUserRepositoryPort(userRepository);

  return async ({ ticketId, updateData, user }) => {
    const ticket = await ticketRepositoryPort.findById(ticketId);
    if (!ticket) {
      throw notFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    const isSupport = isSupportUser(user);
    if (!isTicketOwner(ticket, user) && !isSupport) {
      throw forbiddenError("Not authorized to update this ticket");
    }

    const { status, assignedTo, title, description, priority, category } =
      updateData;

    if (isSupport) {
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

      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;

    await ticketRepositoryPort.save(ticket);
    return ticketRepositoryPort.findByIdPopulated(ticketId);
  };
};
