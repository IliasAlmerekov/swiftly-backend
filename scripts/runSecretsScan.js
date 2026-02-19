import { spawnSync } from "node:child_process";

const args = [
  "detect",
  "--source",
  ".",
  "--config",
  ".gitleaks.toml",
  "--redact",
  "--no-banner",
];

const run = (cmd, cmdArgs) =>
  spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

const binary = run("gitleaks", ["version"]);
if (binary.status === 0) {
  const scan = run("gitleaks", args);
  process.exit(scan.status ?? 1);
}

console.error(
  "gitleaks binary not found. Install gitleaks to run secret scanning locally."
);
console.error(
  "Docs: https://github.com/gitleaks/gitleaks#installation"
);
process.exit(1);
