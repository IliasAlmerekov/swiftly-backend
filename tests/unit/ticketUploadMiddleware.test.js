import {
  allowedTicketMimeTypes,
  MAX_TICKET_ATTACHMENT_SIZE_BYTES
} from "../../src/middlewares/ticketUploadMiddleware.js";

describe("ticketUploadMiddleware config", () => {
  test("allows required attachment mime types", () => {
    expect(allowedTicketMimeTypes.has("video/mp4")).toBe(true);
    expect(allowedTicketMimeTypes.has("audio/mpeg")).toBe(true);
    expect(allowedTicketMimeTypes.has("application/pdf")).toBe(true);
    expect(allowedTicketMimeTypes.has("application/msword")).toBe(true);
    expect(
      allowedTicketMimeTypes.has(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(true);
  });

  test("sets max attachment size to 25MB", () => {
    expect(MAX_TICKET_ATTACHMENT_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });
});
