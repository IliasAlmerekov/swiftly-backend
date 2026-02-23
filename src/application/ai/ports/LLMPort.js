import { assertPort } from "../../ports/assertPort.js";

export const assertLLMPort = llmPort =>
  assertPort("LLMPort", llmPort, ["completeChat"]);

