export const assertPort = (portName, port, requiredMethods) => {
  if (!port || typeof port !== "object") {
    throw new TypeError(`${portName} is required`);
  }

  for (const methodName of requiredMethods) {
    if (typeof port[methodName] !== "function") {
      throw new TypeError(
        `${portName}.${methodName} must be implemented as a function`
      );
    }
  }

  return port;
};
