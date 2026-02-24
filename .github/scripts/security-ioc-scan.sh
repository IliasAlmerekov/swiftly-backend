#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
PATTERN_FILE="${REPO_ROOT}/.github/security/ioc-patterns.txt"
TARGETS=(.github/workflows .gitlab-ci.yml package.json package-lock.json .cursor)

if [[ ! -f "${PATTERN_FILE}" ]]; then
  echo "IOC pattern file not found: ${PATTERN_FILE}" >&2
  exit 1
fi

MATCHES=""
for target in "${TARGETS[@]}"; do
  if [[ -e "${REPO_ROOT}/${target}" ]]; then
    RESULT="$(grep -RInFf "${PATTERN_FILE}" "${REPO_ROOT}/${target}" || true)"
    if [[ -n "${RESULT}" ]]; then
      MATCHES+="${RESULT}"$'\n'
    fi
  fi
done

if [[ -n "${MATCHES}" ]]; then
  printf "Suspicious IOC patterns found:\n%b" "${MATCHES}"
  exit 1
fi

echo "No known SANDWORM_MODE IOC patterns found."
