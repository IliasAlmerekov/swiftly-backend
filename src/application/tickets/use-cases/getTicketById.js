import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { isSupportUser, isTicketOwner } from "../lib/access.js";
import { forbiddenError, notFoundError } from "../lib/errors.js";

export const createGetTicketByIdUseCase = ({ ticketRepository }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);

  return async ({ ticketId, user }) => {
    const ticket = await ticketRepositoryPort.findByIdPopulated(ticketId);
    if (!ticket) {
      throw notFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    if (!isTicketOwner(ticket, user) && !isSupportUser(user)) {
      throw forbiddenError("Not authorized to view this ticket");
    }

    return ticket;
  };
};
