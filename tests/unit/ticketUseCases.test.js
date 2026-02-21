import { jest } from "@jest/globals";
import { encodeCursor } from "../../src/utils/cursor.js";
import { createTicketUseCases } from "../../src/application/tickets/use-cases/index.js";

const createPorts = () => {
  const ticketRepository = {
    findFilteredPopulated: jest.fn(),
    findByIdPopulated: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const userRepository = {
    findSupportUserById: jest.fn(),
  };

  const fileStorage = {
    uploadTicketAttachment: jest.fn(),
    removeTemporaryFile: jest.fn(),
  };

  const clock = {
    now: jest.fn(() => new Date("2026-02-21T10:00:00.000Z")),
  };

  return {
    ticketRepository,
    userRepository,
    fileStorage,
    clock,
  };
};

const createUseCases = () => {
  const ports = createPorts();
  const useCases = createTicketUseCases(ports);

  return {
    ...ports,
    useCases,
  };
};

describe("ticket use-cases", () => {
  test("listTickets denies non-support users for all scope", async () => {
    const { useCases } = createUseCases();

    await expect(
      useCases.listTickets({
        user: { _id: "u1", role: "user" },
        query: { scope: "all" },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      status: 403,
    });
  });

  test("listTickets builds filters for assignedToMe + today + status", async () => {
    const { useCases, ticketRepository } = createUseCases();
    ticketRepository.findFilteredPopulated.mockResolvedValue([
      { _id: "t1", createdAt: new Date("2026-02-21T09:00:00.000Z") },
      { _id: "t0", createdAt: new Date("2026-02-21T08:00:00.000Z") },
      { _id: "t-1", createdAt: new Date("2026-02-21T07:00:00.000Z") },
    ]);

    await useCases.listTickets({
      user: { _id: "support-id", role: "support1" },
      query: {
        scope: "assignedToMe",
        includeUnassigned: true,
        status: ["open", "in-progress"],
        date: "today",
        limit: 2,
      },
    });

    const [{ filter, limit }] = ticketRepository.findFilteredPopulated.mock.calls[0];
    expect(limit).toBe(3);
    expect(filter.$and).toEqual(
      expect.arrayContaining([
        {
          $or: [{ assignedTo: "support-id" }, { assignedTo: null }],
        },
        {
          status: { $in: ["open", "in-progress"] },
        },
      ])
    );
    const dateFilter = filter.$and.find(item => item.createdAt);
    expect(dateFilter.createdAt.$gte).toBeInstanceOf(Date);
    expect(dateFilter.createdAt.$lte).toBeInstanceOf(Date);
  });

  test("getTicketById denies access when user is not owner and not support", async () => {
    const { useCases, ticketRepository } = createUseCases();
    ticketRepository.findByIdPopulated.mockResolvedValue({
      _id: "t1",
      owner: "u2",
    });

    await expect(
      useCases.getTicketById({
        ticketId: "t1",
        user: { _id: "u1", role: "user" },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      status: 403,
    });
  });

  test("createTicket sets owner and open status", async () => {
    const { useCases, ticketRepository } = createUseCases();
    ticketRepository.create.mockResolvedValue({ _id: "t1" });

    await useCases.createTicket({
      title: "Title",
      description: "Description",
      user: { _id: "u1" },
    });

    expect(ticketRepository.create).toHaveBeenCalledWith({
      title: "Title",
      description: "Description",
      owner: "u1",
      status: "open",
    });
  });

  test("updateTicket validates assignee role for support users", async () => {
    const { useCases, ticketRepository, userRepository } = createUseCases();
    ticketRepository.findById.mockResolvedValue({
      owner: "u1",
      comments: [],
      attachments: [],
    });
    userRepository.findSupportUserById.mockResolvedValue(null);

    await expect(
      useCases.updateTicket({
        ticketId: "t1",
        updateData: { assignedTo: "u2" },
        user: { _id: "u1", role: "admin" },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      status: 400,
    });
  });

  test("triageTicket denies non-support users", async () => {
    const { useCases } = createUseCases();

    await expect(
      useCases.triageTicket({
        ticketId: "t1",
        triageData: { status: "resolved" },
        user: { _id: "u1", role: "user" },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      status: 403,
    });
  });

  test("addComment appends comment and returns populated ticket", async () => {
    const { useCases, ticketRepository } = createUseCases();
    const ticket = {
      owner: "u1",
      comments: [],
      attachments: [],
    };
    const populated = { _id: "t1", comments: [{ content: "hello" }] };
    ticketRepository.findById.mockResolvedValue(ticket);
    ticketRepository.findByIdPopulated.mockResolvedValue(populated);

    const result = await useCases.addComment({
      ticketId: "t1",
      content: "hello",
      user: { _id: "u1", role: "user" },
    });

    expect(ticket.comments).toEqual([{ content: "hello", author: "u1" }]);
    expect(ticketRepository.save).toHaveBeenCalledWith(ticket);
    expect(result).toBe(populated);
  });

  test("uploadAttachment stores metadata and always removes temp file", async () => {
    const { useCases, ticketRepository, fileStorage } = createUseCases();
    const ticket = {
      owner: "u1",
      comments: [],
      attachments: [],
    };
    ticketRepository.findById.mockResolvedValue(ticket);
    fileStorage.uploadTicketAttachment.mockResolvedValue({
      publicId: "public-1",
      url: "https://example.com/file.png",
    });

    const attachments = await useCases.uploadAttachment({
      ticketId: "t1",
      file: {
        path: "/tmp/file.png",
        mimetype: "image/png",
        size: 2048,
        originalname: "file.png",
      },
      user: { _id: "u1", role: "user" },
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      public_id: "public-1",
      url: "https://example.com/file.png",
      mime: "image/png",
      size: 2048,
      originalName: "file.png",
    });
    expect(ticketRepository.save).toHaveBeenCalledWith(ticket);
    expect(fileStorage.removeTemporaryFile).toHaveBeenCalledWith("/tmp/file.png");
  });

  test("uploadAttachment cleans temp file when upload fails", async () => {
    const { useCases, ticketRepository, fileStorage } = createUseCases();
    ticketRepository.findById.mockResolvedValue({
      owner: "u1",
      comments: [],
      attachments: [],
    });
    fileStorage.uploadTicketAttachment.mockRejectedValue(new Error("upload failed"));

    await expect(
      useCases.uploadAttachment({
        ticketId: "t1",
        file: {
          path: "/tmp/file.png",
          mimetype: "image/png",
          size: 2048,
          originalname: "file.png",
        },
        user: { _id: "u1", role: "user" },
      })
    ).rejects.toThrow("upload failed");

    expect(fileStorage.removeTemporaryFile).toHaveBeenCalledWith("/tmp/file.png");
  });

  test("listTickets accepts cursor and forwards decoded value", async () => {
    const { useCases, ticketRepository } = createUseCases();
    ticketRepository.findFilteredPopulated.mockResolvedValue([]);
    const cursor = encodeCursor({
      createdAt: new Date("2026-02-20T08:00:00.000Z"),
      id: "65f1a6e43e7c83b9d8a0f123",
    });

    await useCases.listTickets({
      user: { _id: "u1", role: "admin" },
      query: { cursor },
    });

    const [{ cursor: decodedCursor }] =
      ticketRepository.findFilteredPopulated.mock.calls[0];
    expect(decodedCursor).toMatchObject({
      _id: "65f1a6e43e7c83b9d8a0f123",
    });
    expect(decodedCursor.createdAt).toBeInstanceOf(Date);
  });
});
