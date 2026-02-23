export const createAuthMiddleware = ({ authService }) => {
  return async (req, _res, next) => {
    try {
      req.user = await authService.resolveAuthContext({
        authorizationHeader: req.headers.authorization,
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
