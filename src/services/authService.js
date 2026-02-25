import { createAuthUseCases } from "../application/auth/use-cases/index.js";

class AuthService {
  constructor({ userRepo, refreshTokenRepo, passwordHasher, tokenProvider }) {
    this.tokenProvider = tokenProvider;
    this.useCases = createAuthUseCases({
      userRepo,
      refreshTokenRepo,
      passwordHasher,
      tokenProvider,
    });
  }

  async register(payload) {
    return this.useCases.register(payload);
  }

  async login(payload) {
    return this.useCases.login(payload);
  }

  async refresh(payload) {
    return this.useCases.refresh(payload);
  }

  async logout(payload) {
    return this.useCases.logout(payload);
  }

  async resolveAuthContext(payload) {
    return this.useCases.resolveAuthContext(payload);
  }

  async listAssignableAdmins(payload) {
    return this.useCases.listAssignableAdmins(payload);
  }

  resolveTokenExpiryDates({ accessToken, refreshToken }) {
    return {
      accessTokenExpiresAt:
        this.tokenProvider.resolveTokenExpiryDate(accessToken),
      refreshTokenExpiresAt:
        this.tokenProvider.resolveTokenExpiryDate(refreshToken),
    };
  }
}

export default AuthService;
