import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEDGER_PATH = "docs/migration/vertical-slice-ledger.json";
const EXPECTED_SLICE_ORDER = ["tickets", "auth", "ai"];
const EXPECTED_FLOW = ["transfer", "tests", "contract_check", "merge"];
const STAGE_ORDER = [
  "planned",
  "transferred",
  "tested",
  "contract_verified",
  "merged",
];

const STAGE_REQUIREMENTS = {
  planned: [],
  transferred: ["transfer"],
  tested: ["transfer", "tests"],
  contract_verified: ["transfer", "tests", "contract_check"],
  merged: ["transfer", "tests", "contract_check", "merge"],
};

const isObject = value =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toAbsPath = (rootDir, filePath) => path.resolve(rootDir, filePath);

export const validateVerticalSliceMigrationLedger = ({
  ledger,
  rootDir = process.cwd(),
  pathExists = fs.existsSync,
  expectedSliceOrder = EXPECTED_SLICE_ORDER,
  expectedFlow = EXPECTED_FLOW,
} = {}) => {
  const errors = [];

  if (!isObject(ledger)) {
    return ["Ledger must be a JSON object."];
  }

  if (
    !Array.isArray(ledger.sliceOrder) ||
    ledger.sliceOrder.length !== expectedSliceOrder.length ||
    ledger.sliceOrder.some((slice, index) => slice !== expectedSliceOrder[index])
  ) {
    errors.push(
      `sliceOrder must be exactly: ${expectedSliceOrder.join(" -> ")}.`
    );
  }

  if (
    !Array.isArray(ledger.requiredFlow) ||
    ledger.requiredFlow.length !== expectedFlow.length ||
    ledger.requiredFlow.some((step, index) => step !== expectedFlow[index])
  ) {
    errors.push(
      `requiredFlow must be exactly: ${expectedFlow.join(" -> ")}.`
    );
  }

  if (!isObject(ledger.slices)) {
    errors.push("slices must be an object keyed by slice name.");
  } else {
    let previousStageIndex = STAGE_ORDER.length - 1;

    for (const sliceName of expectedSliceOrder) {
      const slice = ledger.slices[sliceName];
      if (!isObject(slice)) {
        errors.push(`slices.${sliceName} is required.`);
        continue;
      }

      const stageIndex = STAGE_ORDER.indexOf(slice.stage);
      if (stageIndex === -1) {
        errors.push(
          `slices.${sliceName}.stage must be one of: ${STAGE_ORDER.join(", ")}.`
        );
      } else if (stageIndex > previousStageIndex) {
        errors.push(
          `Vertical slice order violated: ${sliceName} cannot be ahead of previous slice in migration stage.`
        );
      } else {
        previousStageIndex = stageIndex;
      }

      if (!isObject(slice.checkpoints)) {
        errors.push(`slices.${sliceName}.checkpoints must be an object.`);
        continue;
      }

      for (const checkpoint of expectedFlow) {
        if (typeof slice.checkpoints[checkpoint] !== "boolean") {
          errors.push(
            `slices.${sliceName}.checkpoints.${checkpoint} must be boolean.`
          );
        }
      }

      const requiredCheckpoints = STAGE_REQUIREMENTS[slice.stage] || [];
      for (const checkpoint of requiredCheckpoints) {
        if (slice.checkpoints[checkpoint] !== true) {
          errors.push(
            `slices.${sliceName} at stage "${slice.stage}" requires checkpoints.${checkpoint}=true.`
          );
        }
      }

      if (slice.stage !== "merged" && slice.checkpoints.merge === true) {
        errors.push(
          `slices.${sliceName} has checkpoints.merge=true but stage is "${slice.stage}".`
        );
      }
    }
  }

  if (!isObject(ledger.legacyLayer)) {
    errors.push("legacyLayer section is required.");
  } else {
    const { status, integrationGreen, legacyPaths } = ledger.legacyLayer;
    if (status !== "retained" && status !== "removed") {
      errors.push('legacyLayer.status must be either "retained" or "removed".');
    }
    if (typeof integrationGreen !== "boolean") {
      errors.push("legacyLayer.integrationGreen must be boolean.");
    }
    if (!Array.isArray(legacyPaths) || legacyPaths.length === 0) {
      errors.push("legacyLayer.legacyPaths must be a non-empty array.");
    } else {
      const missingPaths = legacyPaths.filter(
        legacyPath => !pathExists(toAbsPath(rootDir, legacyPath))
      );

      if (status === "retained" && missingPaths.length > 0) {
        errors.push(
          `Legacy layer is retained, but files are missing: ${missingPaths.join(", ")}.`
        );
      }

      if (status === "removed" && integrationGreen !== true) {
        errors.push(
          "Legacy layer removal is only allowed when integrationGreen=true."
        );
      }

      if (status === "removed" && missingPaths.length === 0) {
        errors.push(
          "legacyLayer.status is \"removed\" but all legacyPaths still exist."
        );
      }
    }
  }

  return errors;
};

const loadLedger = rootDir => {
  const ledgerAbsPath = toAbsPath(rootDir, LEDGER_PATH);
  const content = fs.readFileSync(ledgerAbsPath, "utf8");
  return JSON.parse(content);
};

const run = () => {
  try {
    const rootDir = process.cwd();
    const ledger = loadLedger(rootDir);
    const errors = validateVerticalSliceMigrationLedger({ ledger, rootDir });

    if (errors.length > 0) {
      console.error("Vertical slice migration ledger validation failed:");
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    console.log("Vertical slice migration ledger is valid.");
  } catch (error) {
    console.error("Failed to validate vertical slice migration ledger.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
