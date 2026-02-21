import { assertPort } from "./assertPort.js";

const FILE_STORAGE_METHODS = ["uploadTicketAttachment", "removeTemporaryFile"];

export const assertFileStoragePort = fileStorage =>
  assertPort("FileStoragePort", fileStorage, FILE_STORAGE_METHODS);
