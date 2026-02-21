import { createAddCommentUseCase } from "./addComment.js";
import { createCreateTicketUseCase } from "./createTicket.js";
import { createGetTicketByIdUseCase } from "./getTicketById.js";
import { createListTicketsUseCase } from "./listTickets.js";
import { createTriageTicketUseCase } from "./triageTicket.js";
import { createUpdateTicketUseCase } from "./updateTicket.js";
import { createUploadAttachmentUseCase } from "./uploadAttachment.js";

export const createTicketUseCases = ({
  ticketRepository,
  userRepository,
  fileStorage,
  clock,
}) => ({
  listTickets: createListTicketsUseCase({ ticketRepository, clock }),
  getTicketById: createGetTicketByIdUseCase({ ticketRepository }),
  createTicket: createCreateTicketUseCase({ ticketRepository }),
  updateTicket: createUpdateTicketUseCase({
    ticketRepository,
    userRepository,
  }),
  triageTicket: createTriageTicketUseCase({
    ticketRepository,
    userRepository,
  }),
  addComment: createAddCommentUseCase({ ticketRepository }),
  uploadAttachment: createUploadAttachmentUseCase({
    ticketRepository,
    fileStorage,
  }),
});
