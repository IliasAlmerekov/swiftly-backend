# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Changed

- Internal refactor, no API changes: introduced enforced zero-downtime vertical-slice migration workflow (`tickets -> auth -> ai`) with per-slice transfer/tests/contract checks and legacy-removal integration gate.
