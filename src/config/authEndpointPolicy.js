export const authModes = Object.freeze({
  required: "required",
  none: "none",
});

const authEndpointPolicyRegistry = Object.freeze({
  "POST /register": Object.freeze({
    authMode: authModes.none,
    credentialsPolicy: "omit",
  }),
  "POST /login": Object.freeze({
    authMode: authModes.none,
    credentialsPolicy: "omit",
  }),
  "GET /csrf": Object.freeze({
    authMode: authModes.none,
    credentialsPolicy: "include",
  }),
  "POST /refresh": Object.freeze({
    authMode: authModes.none,
    credentialsPolicy: "include",
    refreshTokenSource: "cookie",
  }),
  "POST /logout": Object.freeze({
    authMode: authModes.required,
    credentialsPolicy: "include",
    requiredAuthSource: "cookie",
  }),
  "GET /me": Object.freeze({
    authMode: authModes.required,
    credentialsPolicy: "include",
    requiredAuthSource: "cookie",
  }),
  "GET /admins": Object.freeze({
    authMode: authModes.required,
    credentialsPolicy: "include",
    requiredAuthSource: "cookie",
  }),
});

const policyByEndpoint = new Map(Object.entries(authEndpointPolicyRegistry));

const buildEndpointKey = ({ method, path }) =>
  `${String(method || "").toUpperCase()} ${path}`;

export const getAuthEndpointPolicy = ({ method, path }) => {
  const endpointKey = buildEndpointKey({ method, path });
  const policy = policyByEndpoint.get(endpointKey);

  if (!policy) {
    throw new Error(`Auth endpoint policy is missing for: ${endpointKey}`);
  }

  return policy;
};

export const authEndpointPolicy = authEndpointPolicyRegistry;
