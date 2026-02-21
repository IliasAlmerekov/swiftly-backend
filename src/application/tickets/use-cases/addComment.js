import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { isSupportUser, isTicketOwner } from "../lib/access.js";
import { forbiddenError, notFoundError, badRequestError } from "../lib/errors.js";

export const createAddCommentUseCase = ({ ticketRepository }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);

  return async ({ ticketId, content, user }) => {
    if (!content) {
      throw badRequestError("Comment content is required", "COMMENT_REQUIRED");
    }

    const ticket = await ticketRepositoryPort.findById(ticketId);
    if (!ticket) {
      throw notFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    if (!isTicketOwner(ticket, user) && !isSupportUser(user)) {
      throw forbiddenError("Not authorized to comment on this ticket");
    }

    ticket.comments.push({ content, author: user._id });
    await ticketRepositoryPort.save(ticket);

    return ticketRepositoryPort.findByIdPopulated(ticketId);
  };
};
