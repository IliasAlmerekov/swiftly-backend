import { jest } from "@jest/globals";
import Ticket from "../../src/models/ticketModel.js";
import User from "../../src/models/userModel.js";
import MongooseTicketRepository from "../../src/infrastructure/persistence/mongoose/MongooseTicketRepository.js";
import MongooseUserRepository from "../../src/infrastructure/persistence/mongoose/MongooseUserRepository.js";
import CloudinaryFileStorage from "../../src/infrastructure/storage/CloudinaryFileStorage.js";

let emailCounter = 0;

const createUser = async (overrides = {}) => {
  emailCounter += 1;
  return User.create({
    name: `Test User ${emailCounter}`,
    email: `user-${emailCounter}@example.com`,
    password: "password123",
    role: "user",
    ...overrides,
  });
};

describe("Infrastructure adapters integration", () => {
  describe("MongooseTicketRepository", () => {
    test("findByIdPopulated loads owner, assignee and comment author", async () => {
      const repository = new MongooseTicketRepository({ Ticket });
      const owner = await createUser();
      const assignee = await createUser({ role: "support1" });
      const commentAuthor = await createUser({ role: "admin" });

      const createdTicket = await Ticket.create({
        title: "Printer is offline",
        description: "Office printer cannot be reached",
        owner: owner._id,
        assignedTo: assignee._id,
        comments: [
          {
            content: "Investigating now",
            author: commentAuthor._id,
          },
        ],
      });

      const populatedTicket = await repository.findByIdPopulated(createdTicket._id);

      expect(populatedTicket).not.toBeNull();
      expect(populatedTicket.owner.email).toBe(owner.email);
      expect(populatedTicket.assignedTo.email).toBe(assignee.email);
      expect(populatedTicket.comments[0].author.email).toBe(commentAuthor.email);
    });

    test("findFilteredPopulated applies owner filter, cursor and limit", async () => {
      const repository = new MongooseTicketRepository({ Ticket });
      const owner = await createUser();

      const newest = await Ticket.create({
        title: "Newest ticket",
        description: "Newest issue",
        owner: owner._id,
        createdAt: new Date("2026-02-21T10:00:00.000Z"),
      });
      const middle = await Ticket.create({
        title: "Middle ticket",
        description: "Middle issue",
        owner: owner._id,
        createdAt: new Date("2026-02-21T09:00:00.000Z"),
      });
      await Ticket.create({
        title: "Oldest ticket",
        description: "Oldest issue",
        owner: owner._id,
        createdAt: new Date("2026-02-21T08:00:00.000Z"),
      });

      const firstPage = await repository.findFilteredPopulated({
        filter: { owner: owner._id },
        limit: 2,
      });

      expect(firstPage).toHaveLength(2);
      expect(firstPage[0]._id.toString()).toBe(newest._id.toString());
      expect(firstPage[1]._id.toString()).toBe(middle._id.toString());

      const secondPage = await repository.findFilteredPopulated({
        filter: { owner: owner._id },
        cursor: { createdAt: middle.createdAt, _id: middle._id },
        limit: 2,
      });

      expect(secondPage).toHaveLength(1);
      expect(secondPage[0].title).toBe("Oldest ticket");
    });
  });

  describe("MongooseUserRepository", () => {
    test("findSupportUsers and findSupportUserById return only support roles", async () => {
      const repository = new MongooseUserRepository({ User });
      const regularUser = await createUser({ role: "user" });
      const supportUser = await createUser({ role: "support1" });
      const adminUser = await createUser({ role: "admin" });

      const supportUsers = await repository.findSupportUsers();
      const supportIds = supportUsers.map(user => user._id.toString());

      expect(supportIds).toContain(supportUser._id.toString());
      expect(supportIds).toContain(adminUser._id.toString());
      expect(supportIds).not.toContain(regularUser._id.toString());

      const foundSupport = await repository.findSupportUserById(supportUser._id);
      const notFoundRegular = await repository.findSupportUserById(regularUser._id);

      expect(foundSupport._id.toString()).toBe(supportUser._id.toString());
      expect(notFoundRegular).toBeNull();
    });
  });

  describe("CloudinaryFileStorage", () => {
    test("uploadTicketAttachment maps cloudinary response", async () => {
      const cloudinary = {
        uploader: {
          upload: jest.fn().mockResolvedValue({
            public_id: "ticket-1",
            secure_url: "https://cdn.example.com/ticket-1.png",
          }),
        },
      };
      const storage = new CloudinaryFileStorage({
        cloudinary,
        fsModule: { unlinkSync: jest.fn() },
        loggerInstance: { warn: jest.fn() },
      });

      const result = await storage.uploadTicketAttachment("/tmp/ticket-1.png");

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith("/tmp/ticket-1.png", {
        folder: "ticket-attachments",
        resource_type: "auto",
      });
      expect(result).toEqual({
        publicId: "ticket-1",
        url: "https://cdn.example.com/ticket-1.png",
      });
    });

    test("removeTemporaryFile uses fs.unlinkSync and swallows unlink errors", async () => {
      const unlinkError = new Error("disk error");
      const fsModule = {
        unlinkSync: jest.fn().mockImplementation(() => {
          throw unlinkError;
        }),
      };
      const loggerInstance = { warn: jest.fn() };
      const storage = new CloudinaryFileStorage({
        cloudinary: { uploader: { upload: jest.fn() } },
        fsModule,
        loggerInstance,
      });

      await expect(storage.removeTemporaryFile("/tmp/ticket-1.png")).resolves.toBeUndefined();
      expect(fsModule.unlinkSync).toHaveBeenCalledWith("/tmp/ticket-1.png");
      expect(loggerInstance.warn).toHaveBeenCalledWith(
        { error: unlinkError, filePath: "/tmp/ticket-1.png" },
        "Failed to remove temporary upload file"
      );
    });
  });
});
