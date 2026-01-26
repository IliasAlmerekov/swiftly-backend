import { jest } from "@jest/globals";

const mockFindById = jest.fn();

jest.unstable_mockModule("../../src/models/ticketModel.js", () => ({
  default: { findById: mockFindById }
}));

const { requireTicketOwnerOrRole } = await import(
  "../../src/middlewares/ticketOwnershipMiddleware.js"
);

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe("ticketOwnershipMiddleware", () => {
  beforeEach(() => {
    mockFindById.mockReset();
  });

  test("rejects when not authenticated", async () => {
    const req = { user: null, params: { ticketId: "t1" } };
    const res = createRes();
    const next = jest.fn();

    await requireTicketOwnerOrRole(["admin"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
  });

  test("allows support roles", async () => {
    const req = { user: { role: "admin" }, params: { ticketId: "t1" } };
    const res = createRes();
    const next = jest.fn();

    await requireTicketOwnerOrRole(["admin"])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("rejects when ticket not found", async () => {
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    const req = {
      user: { role: "user", _id: "u1" },
      params: { ticketId: "t1" }
    };
    const res = createRes();
    const next = jest.fn();

    await requireTicketOwnerOrRole(["admin"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Ticket not found" });
  });

  test("rejects when not owner", async () => {
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ owner: "u2" })
    });

    const req = {
      user: { role: "user", _id: "u1" },
      params: { ticketId: "t1" }
    };
    const res = createRes();
    const next = jest.fn();

    await requireTicketOwnerOrRole(["admin"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied" });
  });

  test("allows owner", async () => {
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ owner: "u1" })
    });

    const req = {
      user: { role: "user", _id: "u1" },
      params: { ticketId: "t1" }
    };
    const res = createRes();
    const next = jest.fn();

    await requireTicketOwnerOrRole(["admin"])(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

