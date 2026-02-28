import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authCookieNames,
  getAuthCookieOptions,
  getClearingCookieOptions,
} from "../config/authCookies.js";
import { getCookieValue } from "../utils/cookies.js";
import { validateDto } from "../validation/validateDto.js";
import { getAuthEndpointPolicy } from "../config/authEndpointPolicy.js";
import {
  authLoginDto,
  authLogoutDto,
  authRefreshDto,
  authRegisterDto,
} from "../validation/schemas.js";
import { badRequestError } from "../application/auth/lib/errors.js";

const buildStrictSessionPayload = user => ({
  user,
  authenticated: true,
});

const buildStrictRefreshPayload = () => ({
  authenticated: true,
});

const pickSafeUserFields = user => {
  const safeUser = {
    _id: user?._id,
    email: user?.email,
    name: user?.name,
    role: user?.role,
  };

  return Object.fromEntries(
    Object.entries(safeUser).filter(([, value]) => value !== undefined)
  );
};

const setAuthCookies = (res, authService, tokenPair) => {
  const { accessTokenExpiresAt, refreshTokenExpiresAt } =
    authService.resolveTokenExpiryDates({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    });

  res.cookie(
    authCookieNames.accessToken,
    tokenPair.accessToken,
    getAuthCookieOptions(accessTokenExpiresAt)
  );
  res.cookie(
    authCookieNames.refreshToken,
    tokenPair.refreshToken,
    getAuthCookieOptions(refreshTokenExpiresAt)
  );
};

const clearAuthCookies = res => {
  const clearingOptions = getClearingCookieOptions();

  res.cookie(authCookieNames.accessToken, "", clearingOptions);
  res.cookie(authCookieNames.refreshToken, "", clearingOptions);
};

export const createAuthController = ({
  authService,
  resolveAuthEndpointPolicy = getAuthEndpointPolicy,
}) => ({
  register: asyncHandler(async (req, res) => {
    const payload = validateDto(authRegisterDto, req.body);
    const result = await authService.register(payload);

    setAuthCookies(res, authService, result);
    const user = await authService.resolveAuthContext({
      accessToken: result.accessToken,
    });
    res.status(201).json(buildStrictSessionPayload(pickSafeUserFields(user)));
  }),

  login: asyncHandler(async (req, res) => {
    const payload = validateDto(authLoginDto, req.body);
    const result = await authService.login(payload);

    setAuthCookies(res, authService, result);
    const user = await authService.resolveAuthContext({
      accessToken: result.accessToken,
    });
    res.status(200).json(buildStrictSessionPayload(pickSafeUserFields(user)));
  }),

  csrf: asyncHandler(async (_req, res) => {
    const csrfToken = res.locals?.csrfToken;

    if (!csrfToken || typeof csrfToken !== "string") {
      throw new Error("CSRF token missing in request context");
    }

    res.status(200).json({ csrfToken });
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshTokenFromCookie = getCookieValue(
      req.headers.cookie,
      authCookieNames.refreshToken
    );
    const refreshRoutePolicy = resolveAuthEndpointPolicy({
      method: "post",
      path: "/refresh",
    });
    if (refreshRoutePolicy.refreshTokenSource !== "cookie") {
      throw new Error(
        "Auth endpoint policy must require cookie refresh source for: POST /refresh"
      );
    }

    const hasRefreshTokenBodyField = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "refreshToken"
    );

    if (hasRefreshTokenBodyField) {
      throw badRequestError(
        "Refresh token must be provided via cookie",
        "AUTH_COOKIE_REQUIRED"
      );
    }

    const refreshToken = refreshTokenFromCookie ?? undefined;
    const payload = validateDto(authRefreshDto, { refreshToken });
    const result = await authService.refresh(payload);

    setAuthCookies(res, authService, result);
    res.status(200).json(buildStrictRefreshPayload());
  }),

  logout: asyncHandler(async (req, res) => {
    const refreshTokenFromCookie = getCookieValue(
      req.headers.cookie,
      authCookieNames.refreshToken
    );
    const payload = validateDto(authLogoutDto, {
      ...(req.body || {}),
      refreshToken:
        req.body?.refreshToken ?? refreshTokenFromCookie ?? undefined,
    });
    const result = await authService.logout({
      user: req.user,
      ...payload,
    });

    clearAuthCookies(res);
    res.status(200).json(result);
  }),

  me: asyncHandler(async (req, res) => {
    res.status(200).json({
      user: req.user,
      authenticated: true,
    });
  }),

  getAdmins: asyncHandler(async (req, res) => {
    const admins = await authService.listAssignableAdmins({ user: req.user });
    res.status(200).json(admins || []);
  }),
});
