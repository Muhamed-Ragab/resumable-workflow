# AGENTS.md

These instructions apply to **all agents** working in this repository.

## 1) Mission & Scope

- Keep the project aligned with its mission: a lightweight, strictly-typed, resumable workflow engine for Node.js.
- Prefer small, focused changes; avoid unrelated refactors.

## 2) Source of Truth (Read First)

Before implementing, align with:
- `README.md` (public API and usage)
- `CONTRIBUTING.md` (workflow, quality gates)
- `PROJECT_DETAILS.md` (architecture and release model)
- `ralph/README.md` + `relph/*` (Ralph loop execution rules/state)

## 2.1) Skills & MCP Pre-Check (Mandatory Before Implementation)

Before writing code or changing files, agents must:

1. Check whether an installed/global **Skill** matches the task.
2. If a matching skill exists, load and follow its `SKILL.md` workflow first.
3. If multiple skills match, use the minimal set needed and state the order.
4. Check whether an **MCP server/tool** is better suited (docs, GitHub ops, diagrams, design, etc.).
5. Prefer skill/MCP-driven workflows over ad-hoc implementation.
6. In the response, briefly state which skill(s)/MCP server(s) were used (or why none applied).

## 3) Architecture Guardrails

- Keep responsibilities separated:
  - `src/core/*`: workflow orchestration logic
  - `src/storage/*`: persistence providers
  - `src/types/*`: shared contracts/types
- Preserve stateless core behavior; persistence belongs to storage providers.
- Maintain strict typing; avoid `any` unless explicitly justified.
- Follow result-pattern expectations in public behavior.
- Prefer small modules/functions with single responsibility.
- Prefer composition over tightly-coupled logic.
- Keep public API changes backward-compatible unless explicitly planned as breaking.

## 3.1) Code Style Best Practices

- Use consistent formatting and lint-compliant patterns (Biome/Ultracite rules).
- Use clear names for variables/functions/types; avoid ambiguous abbreviations.
- Keep functions focused and short; extract helpers when logic grows.
- Avoid commented-out dead code and TODOs without context.
- Keep imports clean and use `node:` protocol for Node built-ins.
- Keep error messages explicit and actionable.

## 3.2) Clean Code & Maintainability

- Apply refactoring continuously: improve structure without changing behavior.
- Remove duplication (DRY), avoid over-engineering (YAGNI), and keep modules cohesive.
- Prefer expressive APIs and explicit domain terms over clever/implicit logic.
- Handle errors deliberately (typed results where project conventions require it).
- When touching legacy code, leave it cleaner than you found it (Boy Scout Rule).
- Prefer simple control flow (guard clauses, small units) over deep nesting.

## 3.3) SOLID Principles (Use Pragmatically)

- **S (Single Responsibility):** each module/class should have one reason to change.
- **O (Open/Closed):** extend behavior through composition/abstractions rather than editing stable code.
- **L (Liskov Substitution):** derived implementations must honor base contracts.
- **I (Interface Segregation):** expose small, focused interfaces.
- **D (Dependency Inversion):** depend on abstractions, inject concrete implementations.

Apply SOLID where it improves clarity/testability; avoid forcing patterns that add complexity.

## 3.4) Design Patterns Guidance

- Use patterns to solve recurring problems, not as defaults.
- Prefer simple patterns first (Strategy, Factory, Adapter) before complex hierarchies.
- Document why a pattern is chosen and what tradeoff it addresses.
- Re-evaluate patterns during refactoring; remove accidental complexity when no longer needed.

## 4) Ralph Method Rules (Mandatory for Task Loops)

1. Read `relph/rules.md` and `relph/current_task.md` before work.
2. Execute checklist tasks in order (`- [ ] task`).
3. Do not skip unchecked tasks unless user explicitly asks.
4. Mark task done (`- [x]`) only after validation passes.
5. On failure: stop, record failure in progress notes, keep task unchecked.
6. Keep each iteration scoped to one task (or one tightly-coupled unit).

## 5) Implementation Workflow

For each task/change:
1. Implement minimal code changes.
2. Add/update tests in relevant `*.test.ts` files.
3. Run quality checks (see Section 6).
4. Update docs when public behavior/API changes.
5. Commit with clear, scoped message.

### 5.1) Required Commands Timing

- **After finishing each task (before marking it done):**
  - `pnpm run lint`
  - `pnpm run test` (or at least affected tests)
- **Before every commit:**
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run build`
- **When files need normalization:**
  - `pnpm run format` (then re-run lint/tests)
- **Before opening/merging release changes:**
  - `pnpm changeset` (for user-facing changes)
  - `pnpm run version` (only in release/versioning step)

## 6) Validation & Quality Gates

Run these when applicable:
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- `pnpm run format` (if formatting drift exists)

Rules:
- Never claim success unless executed commands pass.
- If a check fails, fix root cause (do not silently bypass rules).
- If format changes code, re-run lint + tests before commit.

## 7) Release & Versioning Rules

- Use Changesets for user-facing changes:
  - `pnpm changeset` (before release PR when needed)
  - `pnpm run version` (version/changelog update)
- Keep `CHANGELOG.md` and `package.json` version in sync through Changesets flow.

## 8) Git & Commit Hygiene

- Keep commits focused and descriptive (one intent per commit).
- Avoid committing generated/temporary/local state accidentally.
- Respect `.gitignore`.
- Do **not** rewrite history (`reset --hard`, force-push) unless user explicitly requests it.

## 9) Security & Safety

- Use safe file/path handling; prevent path traversal risks.
- Validate external/user-provided inputs.
- Do not introduce secrets into code, logs, tests, or commits.

## 10) Communication Standards

- State what you changed, what you ran, and outcomes.
- If blocked, report exact blocker and next best action.
