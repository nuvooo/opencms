# Design: Per-App Test Suite Expansion to >=80% Coverage

## Context

This monorepo has two primary apps with separate test stacks:

- `apps/api` uses Jest (`test`, `test:cov` scripts already exist).
- `apps/web` uses Vitest (`test` script exists).

The goal is to raise and enforce code coverage per app, not only globally.

## Goals

For each app independently (`apps/api`, `apps/web`):

- Reach at least `80%` in `lines`.
- Reach at least `80%` in `statements`.
- Reach at least `80%` in `functions`.
- Reach at least `80%` in `branches`.

Coverage thresholds must be enforced by test configuration so future regressions fail in CI.

## Non-Goals

- No broad architecture refactor unrelated to testability.
- No fake tests written only to execute lines without asserting behavior.
- No dependency on live external services in test runs.

## Approach Overview

Recommended path is incremental hardening per app:

1. Baseline coverage for `apps/api` and identify largest gaps.
2. Add high-value tests in `apps/api` (focus on branch-heavy service/controller paths).
3. Enable Jest coverage thresholds at 80% for all four metrics in `apps/api`.
4. Baseline coverage for `apps/web` and identify largest gaps.
5. Add high-value tests in `apps/web` (utilities, route handlers, conditional UI paths).
6. Enable Vitest coverage thresholds at 80% for all four metrics in `apps/web`.
7. Add/align root scripts for explicit per-app coverage commands.
8. Verify both apps pass thresholds independently.

## Test Strategy by App

### apps/api (Jest)

Primary target areas:

- Service classes with business logic and branching.
- Controllers with validation/error branches.
- Edge cases around tenant/content-type behavior where regressions already happened.

Guidelines:

- Use deterministic mocks for DB/repositories and external providers.
- Assert both success and failure paths.
- Prefer small, explicit unit tests over fragile integration-heavy tests unless integration adds unique value.

Config changes:

- Add `coverageThreshold.global` with all metrics set to `80` in `apps/api/jest.config.ts`.
- Keep existing `collectCoverageFrom`, refining only if we must exclude generated or non-executable files.

### apps/web (Vitest)

Primary target areas:

- Utility functions and transformation helpers.
- Route handler behavior and fallback/error paths.
- Component conditional rendering and interaction branches.

Guidelines:

- Use Testing Library for UI behavior and accessible assertions.
- Mock fetch/network/time/environment boundaries deterministically.
- Prioritize tests that increase branch confidence, not only statement hits.

Config changes:

- Add or update Vitest coverage settings in `apps/web` config to enforce:
  - `lines: 80`
  - `statements: 80`
  - `functions: 80`
  - `branches: 80`

## Command and Workflow Design

Per-app coverage runs:

- `pnpm --filter=api test:cov`
- `pnpm --filter=web test -- --coverage` (or app-level `test:cov` script if added)

Optional root scripts for consistency:

- `test:cov:api`
- `test:cov:web`
- `test:cov` (runs both in sequence)

## Quality and Stability Criteria

A test addition is acceptable only if it is:

- Deterministic (no flaky timing/network coupling).
- Behavior-focused (asserts meaningful outcomes).
- Maintainable (clear setup, clear expectations, minimal fixture noise).

## Error Handling and Risk Management

- If thresholds fail after additions, continue targeted tests on top uncovered branch hotspots.
- If specific files are structurally hard to test, improve seams minimally (extract pure helpers, isolate side effects) without broad refactoring.
- Avoid blanket file exclusions that hide risk.

## Verification Plan

Completion requires all of the following:

1. `apps/api` coverage report shows >=80% for lines/statements/functions/branches.
2. `apps/web` coverage report shows >=80% for lines/statements/functions/branches.
3. Threshold enforcement is active in both app configs.
4. A deliberate threshold violation (or confidence check via config + failing sample) proves enforcement works.

## Deliverables

- Expanded automated tests in `apps/api` and `apps/web`.
- Coverage threshold configuration in both app test setups.
- Script updates for clear per-app coverage execution.
- Final verification output showing both apps independently pass >=80% on all four metrics.
