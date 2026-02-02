# Project: Resumable Workflow

## 1. Core Mission
To provide a lightweight, framework-agnostic Node.js library that ensures multi-step processes can survive server crashes and resume from the last successful step using a declarative, strictly-typed API.

## 2. API Design
```ts
import { createWorkflow } from 'resumable-workflow';

const onboarding = createWorkflow({
  id: "user-onboarding",
  autoResume: true,   // Optional: Auto-resume on initialization
  autoCleanup: true,  // Optional: Delete data after success
  steps: [
    { 
      name: "create-user", 
      run: async ({ input }) => {
        const user = await db.create(input);
        return { userId: user.id };
      } 
    },
    // ...
  ]
});

// Start a workflow
await onboarding.start({ email: "hello@example.com" });

// Manually clear completed runs
await onboarding.clearCompleted();
```

## 3. Implementation Details
- **Architecture:** Class-based `Workflow` engine (stateless logic) with dependency injection for storage.
- **Storage:** Default to File System (JSON). Pluggable interface for Redis/SQL.
- **State Management:** `WorkflowRunState` is persisted atomically. Steps return partial state updates.
- **Auto-Cleanup:** Configurable option to remove persistence data upon successful completion.

## 4. Tech Stack
- **Language:** TypeScript (Strict Mode)
- **Bundler:** `tsup`
- **Test Runner:** `vitest`
- **Package Manager:** `pnpm`
- **Linting:** Biome + Ultracite
- **Version Management:** Changesets
- **CI/CD:** GitHub Actions

## 5. Release Management
- **Local Development:** Run `pnpm changeset` to record changes.
- **Versioning:** Run `pnpm version` to bump versions and update the changelog.
- **Publishing:** Run `pnpm release` (usually handled by CI).

## 6. Project Structure & Responsibilities
- **`src/index.ts` (Public Facade):** The single entry point. Exports `createWorkflow`, `Workflow` class, and types.
- **`src/core/engine.ts` (Orchestrator):** Contains the `Workflow` class. Manages execution, state merging, and checkpointing.
- **`src/storage/file-storage.ts` (Persistence):** Implements `StorageProvider`. Handles filesystem I/O.
- **`src/types/index.ts` (Contracts):** Centralized, strictly-typed definitions for the entire library.

## 7. Knowledge Base & Logic
- **Checkpointing:** State is saved *before* the first step and *after* every successful step.
- **Resuming:** Resumption loads the state and continues from `currentStepIndex`.
- **Idempotency:** The library guarantees *at-least-once* execution for the failing step (it retries it). Users must ensure their step logic is idempotent.
- **Result Pattern:** All public methods return a `WorkflowResult` object (`{ success: true, result: ... }` or `{ success: false, error: ... }`) instead of throwing, except for critical system failures.

## 8. Development Progress
- [x] Project initialization.
- [x] Core engine implementation (Class-based).
- [x] File System storage provider.
- [x] Strict Typing & Generics.
- [x] Result Pattern.
- [x] Auto-Resume & Auto-Cleanup.
- [x] CI/CD & Release Setup.
- [x] Documentation.