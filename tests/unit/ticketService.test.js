import TicketService from "../../src/services/ticketService.js";
import { jest } from "@jest/globals";

const createService = () => {
  const ticketRepository = {
    findAllPopulated: jest.fn(),
    findByOwnerPopulated: jest.fn(),
    findByIdPopulated: jest.fn(),
    findById: jest.fn(),
    findFilteredPopulated: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    countByDateRange: jest.fn(),
    countByOwnerAndDateRange: jest.fn()
  };
  const userRepository = {
    findSupportUserById: jest.fn()
  };
  const cloudinary = {
    uploader: { upload: jest.fn() }
  };
  const fs = { unlinkSync: jest.fn() };

  return {
    service: new TicketService({
      ticketRepository,
      userRepository,
      cloudinary,
      fs
    }),
    ticketRepository,
    userRepository,
    cloudinary,
    fs
  };
};

describe("TicketService", () => {
  test("listTickets rejects non-support users for all scope", async () => {
    const { service } = createService();
    await expect(
      service.listTickets({ role: "user", _id: "u1" }, { scope: "all" })
    ).rejects.toMatchObject({
      statusCode: 403
    });
  });

  test("getTicketById rejects missing ticket", async () => {
    const { service, ticketRepository } = createService();
    ticketRepository.findByIdPopulated.mockResolvedValue(null);

    await expect(
      service.getTicketById("t1", { _id: "u1", role: "user" })
    ).rejects.toMatchObject({ status: 404 });
  });

  test("addComment rejects empty content", async () => {
    const { service } = createService();
    await expect(
      service.addComment("t1", "", { _id: "u1", role: "user" })
    ).rejects.toMatchObject({ status: 400 });
  });

  test("updateTicket rejects invalid assignee", async () => {
    const { service, ticketRepository, userRepository } = createService();
    ticketRepository.findById.mockResolvedValue({
      owner: "u1",
      status: "open"
    });
    userRepository.findSupportUserById.mockResolvedValue(null);

    await expect(
      service.updateTicket(
        "t1",
        { assignedTo: "u2" },
        { _id: "u1", role: "admin" }
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  test("createTicket sets defaults", async () => {
    const { service, ticketRepository } = createService();
    ticketRepository.create.mockResolvedValue({ id: "t1" });

    await service.createTicket({
      title: "Title",
      description: "Desc",
      user: { _id: "u1" }
    });

    expect(ticketRepository.create).toHaveBeenCalledWith({
      title: "Title",
      description: "Desc",
      owner: "u1",
      status: "open"
    });
  });

  test("uploadAttachment stores metadata and cleans up file", async () => {
    const { service, ticketRepository, cloudinary, fs } = createService();
    const ticket = { owner: "u1", attachments: [], save: jest.fn() };
    ticketRepository.findById.mockResolvedValue(ticket);
    cloudinary.uploader.upload.mockResolvedValue({
      public_id: "p1",
      secure_url: "https://example.com/file"
    });

    const attachments = await service.uploadAttachment(
      "t1",
      {
        path: "/tmp/file",
        mimetype: "image/png",
        size: 10,
        originalname: "file.png"
      },
      { _id: "u1", role: "user" }
    );

    expect(attachments).toHaveLength(1);
    expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/file");
  });
});
