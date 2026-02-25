import { validateVerticalSliceMigrationLedger } from "../../scripts/validateVerticalSliceMigration.js";

const createValidLedger = () => ({
  version: 1,
  sliceOrder: ["tickets", "auth", "ai"],
  requiredFlow: ["transfer", "tests", "contract_check", "merge"],
  slices: {
    tickets: {
      stage: "merged",
      checkpoints: {
        transfer: true,
        tests: true,
        contract_check: true,
        merge: true,
      },
    },
    auth: {
      stage: "merged",
      checkpoints: {
        transfer: true,
        tests: true,
        contract_check: true,
        merge: true,
      },
    },
    ai: {
      stage: "merged",
      checkpoints: {
        transfer: true,
        tests: true,
        contract_check: true,
        merge: true,
      },
    },
  },
  legacyLayer: {
    status: "retained",
    removeAfterIntegrationGreen: true,
    integrationGreen: false,
    integrationSuite: "npm run test:integration",
    legacyPaths: [
      "src/services/ticketService.js",
      "src/services/authService.js",
      "src/services/aiService.js",
      "src/container.js",
    ],
  },
});

describe("validateVerticalSliceMigrationLedger", () => {
  test("accepts a valid migration ledger", () => {
    const ledger = createValidLedger();
    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => true,
    });

    expect(errors).toEqual([]);
  });

  test("fails when slice order is changed", () => {
    const ledger = createValidLedger();
    ledger.sliceOrder = ["auth", "tickets", "ai"];

    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => true,
    });

    expect(errors).toContain(
      "sliceOrder must be exactly: tickets -> auth -> ai."
    );
  });

  test("fails when checkpoint flow is broken for merged stage", () => {
    const ledger = createValidLedger();
    ledger.slices.auth.checkpoints.contract_check = false;

    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => true,
    });

    expect(errors).toContain(
      'slices.auth at stage "merged" requires checkpoints.contract_check=true.'
    );
  });

  test("fails when legacy removal is declared before integration green", () => {
    const ledger = createValidLedger();
    ledger.legacyLayer.status = "removed";
    ledger.legacyLayer.integrationGreen = false;

    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => false,
    });

    expect(errors).toContain(
      "Legacy layer removal is only allowed when integrationGreen=true."
    );
  });

  test("fails when legacy status is removed but files still exist", () => {
    const ledger = createValidLedger();
    ledger.legacyLayer.status = "removed";
    ledger.legacyLayer.integrationGreen = true;

    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => true,
    });

    expect(errors).toContain(
      'legacyLayer.status is "removed" but all legacyPaths still exist.'
    );
  });

  test("fails when retained legacy layer paths are missing", () => {
    const ledger = createValidLedger();

    const errors = validateVerticalSliceMigrationLedger({
      ledger,
      pathExists: () => false,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Legacy layer is retained, but files are missing:"),
      ])
    );
  });
});
