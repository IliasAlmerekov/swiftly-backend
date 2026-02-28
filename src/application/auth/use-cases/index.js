import { createListAssignableAdminsUseCase } from "./listAssignableAdmins.js";
import { createLoginUseCase } from "./login.js";
import { createLogoutUseCase } from "./logout.js";
import { createRefreshUseCase } from "./refresh.js";
import { createRegisterUseCase } from "./register.js";
import { createResolveAuthContextUseCase } from "./resolveAuthContext.js";

export const createAuthUseCases = ({
  userRepo,
  refreshTokenRepo,
  passwordHasher,
  tokenProvider,
}) => ({
  register: createRegisterUseCase({
    userRepo,
    refreshTokenRepo,
    passwordHasher,
    tokenProvider,
  }),
  login: createLoginUseCase({
    userRepo,
    refreshTokenRepo,
    passwordHasher,
    tokenProvider,
  }),
  refresh: createRefreshUseCase({ userRepo, refreshTokenRepo, tokenProvider }),
  logout: createLogoutUseCase({ refreshTokenRepo, tokenProvider }),
  resolveAuthContext: createResolveAuthContextUseCase({
    userRepo,
    tokenProvider,
  }),
  listAssignableAdmins: createListAssignableAdminsUseCase({ userRepo }),
});
