import { asyncHandler } from "../utils/asyncHandler.js";
import {
  authCookieNames,
  getAuthCookieOptions,
  getClearingCookieOptions,
} from "../config/authCookies.js";
import { getCookieValue } from "../utils/cookies.js";
import { validateDto } from "../validation/validateDto.js";
import {
  authLoginDto,
  authLogoutDto,
  authRefreshDto,
  authRegisterDto,
} from "../validation/schemas.js";

const buildAuthPayload = ({ userId, accessToken, refreshToken }) => ({
  token: accessToken,
  accessToken,
  refreshToken,
  userId,
});

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

export const createAuthController = ({ authService }) => ({
  register: asyncHandler(async (req, res) => {
    const payload = validateDto(authRegisterDto, req.body);
    const result = await authService.register(payload);

    setAuthCookies(res, authService, result);
    res.status(201).json(buildAuthPayload(result));
  }),

  login: asyncHandler(async (req, res) => {
    const payload = validateDto(authLoginDto, req.body);
    const result = await authService.login(payload);

    setAuthCookies(res, authService, result);
    res.status(200).json(buildAuthPayload(result));
  }),

  refresh: asyncHandler(async (req, res) => {
    const refreshTokenFromCookie = getCookieValue(
      req.headers.cookie,
      authCookieNames.refreshToken
    );
    const refreshToken =
      req.body?.refreshToken ?? refreshTokenFromCookie ?? undefined;
    const payload = validateDto(authRefreshDto, { refreshToken });
    const result = await authService.refresh(payload);

    setAuthCookies(res, authService, result);
    res.status(200).json(buildAuthPayload(result));
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
