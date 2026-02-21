import { assertFileStoragePort } from "../../ports/FileStoragePort.js";
import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";
import { isSupportUser, isTicketOwner } from "../lib/access.js";
import { forbiddenError, notFoundError, badRequestError } from "../lib/errors.js";

export const createUploadAttachmentUseCase = ({ ticketRepository, fileStorage }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);
  const fileStoragePort = assertFileStoragePort(fileStorage);

  return async ({ ticketId, file, user }) => {
    const ticket = await ticketRepositoryPort.findById(ticketId);
    if (!ticket) {
      throw notFoundError("Ticket not found", "TICKET_NOT_FOUND");
    }

    if (!isTicketOwner(ticket, user) && !isSupportUser(user)) {
      throw forbiddenError("Not authorized to add attachments");
    }

    if (!file) {
      throw badRequestError("No file uploaded", "FILE_REQUIRED");
    }

    let uploadResult;
    try {
      uploadResult = await fileStoragePort.uploadTicketAttachment(file.path);
    } finally {
      try {
        await fileStoragePort.removeTemporaryFile(file.path);
      } catch (_removeError) {
        // Storage adapter controls observability and must keep cleanup failures non-fatal.
      }
    }

    ticket.attachments.push({
      public_id: uploadResult.publicId,
      url: uploadResult.url,
      mime: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    });

    await ticketRepositoryPort.save(ticket);
    return ticket.attachments;
  };
};
