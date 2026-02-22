import { jest } from "@jest/globals";
import { createResolveAuthContextUseCase } from "../../src/application/auth/use-cases/resolveAuthContext.js";

const createUseCase = () => {
  const userRepo = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByIdWithoutPassword: jest.fn(),
    findAssignableAdmins: jest.fn(),
  };
  const tokenProvider = {
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    resolveTokenExpiryDate: jest.fn(),
  };

  return {
    userRepo,
    tokenProvider,
    useCase: createResolveAuthContextUseCase({ userRepo, tokenProvider }),
  };
};

describe("auth resolveAuthContext use-case", () => {
  test("rejects missing authorization header", async () => {
    const { useCase } = createUseCase();

    await expect(useCase({ authorizationHeader: undefined })).rejects.toMatchObject({
      statusCode: 401,
      code: "AUTH_REQUIRED",
    });
  });

  test("rejects invalid access token", async () => {
    const { useCase, tokenProvider } = createUseCase();
    tokenProvider.verifyAccessToken.mockImplementation(() => {
      throw new Error("bad token");
    });

    await expect(
      useCase({ authorizationHeader: "Bearer invalid-token" })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "AUTH_INVALID",
    });
  });

  test("rejects non-access token payload", async () => {
    const { useCase, tokenProvider } = createUseCase();
    tokenProvider.verifyAccessToken.mockReturnValue({
      id: "u1",
      tokenType: "refresh",
    });

    await expect(useCase({ authorizationHeader: "Bearer refresh-token" })).rejects.toMatchObject(
      {
        statusCode: 401,
        code: "AUTH_INVALID",
      }
    );
  });

  test("rejects when user does not exist", async () => {
    const { useCase, tokenProvider, userRepo } = createUseCase();
    tokenProvider.verifyAccessToken.mockReturnValue({
      id: "u1",
      tokenType: "access",
    });
    userRepo.findByIdWithoutPassword.mockResolvedValue(null);

    await expect(useCase({ authorizationHeader: "Bearer access-token" })).rejects.toMatchObject(
      {
        statusCode: 401,
        code: "AUTH_INVALID",
      }
    );
  });

  test("returns user context on valid access token", async () => {
    const { useCase, tokenProvider, userRepo } = createUseCase();
    const user = { _id: "u1", role: "admin" };
    tokenProvider.verifyAccessToken.mockReturnValue({
      id: "u1",
      tokenType: "access",
    });
    userRepo.findByIdWithoutPassword.mockResolvedValue(user);

    await expect(
      useCase({ authorizationHeader: "Bearer access-token" })
    ).resolves.toEqual(user);
  });
});
