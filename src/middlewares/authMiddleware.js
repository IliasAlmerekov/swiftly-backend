import { authCookieNames } from "../config/authCookies.js";
import { getCookieValue } from "../utils/cookies.js";

export const createAuthMiddleware = ({ authService }) => {
  return async (req, _res, next) => {
    try {
      const accessTokenFromCookie = getCookieValue(
        req.headers.cookie,
        authCookieNames.accessToken
      );

      req.user = await authService.resolveAuthContext({
        accessToken: accessTokenFromCookie,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
