import { assertPort } from "../../ports/assertPort.js";

export const assertKnowledgeBasePort = knowledgeBasePort =>
  assertPort("KnowledgeBasePort", knowledgeBasePort, [
    "searchSolutions",
    "logRequest",
  ]);

