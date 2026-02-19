import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = [
  "detect",
  "--source",
  ".",
  "--config",
  ".gitleaks.toml",
  "--redact",
  "--no-banner",
];

const run = (cmd, cmdArgs, useShell = false) =>
  spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    shell: useShell,
  });

const getWindowsWingetPath = () => {
  const base = process.env.LOCALAPPDATA;
  if (!base) return null;

  const exe = join(
    base,
    "Microsoft",
    "WinGet",
    "Packages",
    "Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "gitleaks.exe"
  );

  return existsSync(exe) ? exe : null;
};

const binaries = ["gitleaks"];
if (process.platform === "win32") {
  const wingetExe = getWindowsWingetPath();
  if (wingetExe) binaries.push(wingetExe);
}

let selectedBinary = null;
for (const candidate of binaries) {
  const probe = run(candidate, ["version"], candidate === "gitleaks");
  if (probe.status === 0) {
    selectedBinary = candidate;
    break;
  }
}

if (!selectedBinary) {
  console.error(
    "gitleaks binary not found. Install gitleaks to run secret scanning locally."
  );
  console.error("Docs: https://github.com/gitleaks/gitleaks#installation");
  process.exit(1);
}

const scan = run(selectedBinary, args, selectedBinary === "gitleaks");
process.exit(scan.status ?? 1);
