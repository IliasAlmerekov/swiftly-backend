import { asyncHandler } from "../utils/asyncHandler.js";
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

export const createAuthController = ({ authService }) => ({
  register: asyncHandler(async (req, res) => {
    const payload = validateDto(authRegisterDto, req.body);
    const result = await authService.register(payload);

    res.status(201).json(buildAuthPayload(result));
  }),

  login: asyncHandler(async (req, res) => {
    const payload = validateDto(authLoginDto, req.body);
    const result = await authService.login(payload);

    res.status(200).json(buildAuthPayload(result));
  }),

  refresh: asyncHandler(async (req, res) => {
    const payload = validateDto(authRefreshDto, req.body);
    const result = await authService.refresh(payload);

    res.status(200).json(buildAuthPayload(result));
  }),

  logout: asyncHandler(async (req, res) => {
    const payload = validateDto(authLogoutDto, req.body || {});
    const result = await authService.logout({
      user: req.user,
      ...payload,
    });

    res.status(200).json(result);
  }),

  getAdmins: asyncHandler(async (req, res) => {
    const admins = await authService.listAssignableAdmins({ user: req.user });
    res.status(200).json(admins || []);
  }),
});
