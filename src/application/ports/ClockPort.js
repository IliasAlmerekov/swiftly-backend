import { assertPort } from "./assertPort.js";

const CLOCK_METHODS = ["now"];

export const systemClockPort = {
  now: () => new Date(),
};

export const assertClockPort = clock => {
  return assertPort("ClockPort", clock ?? systemClockPort, CLOCK_METHODS);
};
