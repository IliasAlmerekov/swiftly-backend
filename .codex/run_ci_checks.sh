#!/usr/bin/env bash
set +e
overall=0

run_check() {
  local name="$1"
  shift
  echo "===== CHECK: ${name} ====="
  "$@"
  local rc=$?
  echo "===== RESULT: ${name} => exit ${rc} ====="
  if [ ${rc} -ne 0 ]; then
    overall=1
  fi
  echo
}

run_check "npm ci" npm ci
run_check "security IOC self-test" bash ./.github/scripts/security-ioc-scan-self-test.sh
run_check "security IOC scan" bash ./.github/scripts/security-ioc-scan.sh
run_check "npm audit (prod high+)" npm audit --omit=dev --audit-level=high
run_check "arch check" npm run arch:check
run_check "migration check" npm run migration:check
run_check "lint" npm run lint
run_check "format check" npm run format:check
run_check "contract tests" npm run test:contracts
run_check "integration tests" npm run test:integration
run_check "all tests" npm test

exit ${overall}