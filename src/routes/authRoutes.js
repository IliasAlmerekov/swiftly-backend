import express from "express";
import {
  authModes,
  getAuthEndpointPolicy,
} from "../config/authEndpointPolicy.js";

export const createAuthRoutes = ({
  authController,
  authMiddleware,
  resolveAuthEndpointPolicy = getAuthEndpointPolicy,
}) => {
  const router = express.Router();
  const authRouteDefinitions = [
    { method: "post", path: "/register", handler: authController.register },
    { method: "post", path: "/login", handler: authController.login },
    { method: "get", path: "/csrf", handler: authController.csrf },
    {
      method: "post",
      path: "/refresh",
      handler: authController.refresh,
      policyRequirements: Object.freeze({
        requiresCookieRefreshSource: true,
      }),
    },
    {
      method: "post",
      path: "/logout",
      handler: authController.logout,
      policyRequirements: Object.freeze({
        requiresCookieAuthSource: true,
      }),
    },
    {
      method: "get",
      path: "/me",
      handler: authController.me,
      policyRequirements: Object.freeze({
        requiresCookieAuthSource: true,
      }),
    },
    {
      method: "get",
      path: "/admins",
      handler: authController.getAdmins,
      policyRequirements: Object.freeze({
        requiresCookieAuthSource: true,
      }),
    },
  ];

  for (const route of authRouteDefinitions) {
    const policy = resolveAuthEndpointPolicy({
      method: route.method,
      path: route.path,
    });
    const { authMode } = policy;
    const policyRequirements = route.policyRequirements || {};

    if (
      policyRequirements.requiresCookieAuthSource &&
      policy.requiredAuthSource !== "cookie"
    ) {
      throw new Error(
        `Auth endpoint policy must require cookie auth source for: ${route.method.toUpperCase()} ${route.path}`
      );
    }

    if (
      policyRequirements.requiresCookieRefreshSource &&
      policy.refreshTokenSource !== "cookie"
    ) {
      throw new Error(
        `Auth endpoint policy must require cookie refresh source for: ${route.method.toUpperCase()} ${route.path}`
      );
    }

    if (authMode === authModes.required) {
      router[route.method](route.path, authMiddleware, route.handler);
      continue;
    }

    if (authMode === authModes.none) {
      router[route.method](route.path, route.handler);
      continue;
    }

    throw new Error(
      `Unsupported auth mode for ${route.method.toUpperCase()} ${route.path}: ${authMode}`
    );
  }

  return router;
};
