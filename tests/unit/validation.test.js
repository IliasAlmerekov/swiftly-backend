import { validateDto } from "../../src/validation/validateDto.js";
import { authRegisterDto, ticketUpdateDto } from "../../src/validation/schemas.js";

describe("validation", () => {
  test("validateDto throws AppError on invalid payload", () => {
    try {
      validateDto(authRegisterDto, { email: "bad" });
    } catch (error) {
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
      return;
    }
    throw new Error("Expected validation error");
  });

  test("authRegisterDto rejects unknown fields", () => {
    expect(() =>
      validateDto(authRegisterDto, {
        email: "a@b.com",
        password: "123456",
        name: "Test",
        role: "admin"
      })
    ).toThrow();
  });

  test("ticketUpdateDto accepts optional fields", () => {
    const value = validateDto(ticketUpdateDto, { status: "open" });
    expect(value).toEqual({ status: "open" });
  });
});
