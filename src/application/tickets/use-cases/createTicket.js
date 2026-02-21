import { assertTicketRepositoryPort } from "../../ports/TicketRepositoryPort.js";

export const createCreateTicketUseCase = ({ ticketRepository }) => {
  const ticketRepositoryPort = assertTicketRepositoryPort(ticketRepository);

  return async ({ title, description, user }) =>
    ticketRepositoryPort.create({
      title,
      description,
      owner: user._id,
      status: "open",
    });
};
