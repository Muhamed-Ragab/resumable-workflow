# Contributing to Resumable Workflow

Thank you for your interest in improving Resumable Workflow! To maintain high code quality and consistency, please follow these guidelines.

## Development Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Verify the environment:**
   ```bash
   pnpm check && pnpm test
   ```

## Workflow for Adding Features

1. **Create a Branch:** Use descriptive names like `feat/your-feature-name` or `fix/bug-description`.
2. **Implement Feature:**
   - Follow the **Strict Typing** mandate (avoid `any`).
   - Adhere to the **Modular Architecture** (Core logic in `src/core`, storage in `src/storage`).
3. **Write Tests:** Ensure new features are covered by Vitest in the relevant `.test.ts` file.
4. **Lint & Format:**
   ```bash
   pnpm check # Lints and formats automatically
   ```
5. **Add a Changeset:**
   ```bash
   pnpm changeset
   ```
   *Note: PRs without a changeset will not be merged.*

## Coding Standards

- **Biome & Ultracite:** We use highly opinionated linting rules. Do not disable rules unless absolutely necessary and documented.
- **Strict Generics:** Always propagate types through the `Workflow<TInput, TState>` class to maintain developer IntelliSense.
- **Result Pattern:** Functions that can fail should return a `WorkflowResult` instead of throwing exceptions.
- **Node Protocol:** Use the `node:` prefix for all built-in module imports (e.g., `import fs from 'node:fs/promises'`).

## Pull Request Process

- Ensure the CI pipeline passes on your PR.
- Document new features in the `README.md`.
- Keep PRs focused; avoid combining unrelated changes.

## Architectural Integrity

- **Stateless Core:** The `Workflow` class should not hold session state; it must delegate all persistence to the `StorageProvider`.
- **Generic State:** Ensure `TState` always extends `Record<string, unknown>`.

Thank you for contributing!