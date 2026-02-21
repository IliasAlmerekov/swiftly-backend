import { assertPort } from "./assertPort.js";

const TICKET_REPOSITORY_METHODS = [
  "findFilteredPopulated",
  "findByIdPopulated",
  "findById",
  "create",
  "save",
];

export const assertTicketRepositoryPort = ticketRepository =>
  assertPort(
    "TicketRepositoryPort",
    ticketRepository,
    TICKET_REPOSITORY_METHODS
  );
