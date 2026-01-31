# Project: Resumable Workflow

## 1. Core Mission
To provide a lightweight, framework-agnostic Node.js library that ensures multi-step processes can survive server crashes and resume from the last successful step using a declarative functional API.

## 2. API Design (Option A)
```ts
const onboarding = createWorkflow({
  id: "user-onboarding",
  autoResume: true, // Optional: auto-resume on initialization
  steps: [
    { 
      name: "create-user", 
      run: async ({ input }) => {
        const user = await db.create(input);
        return { userId: user.id };
      } 
    },
    { 
      name: "send-email", 
      run: async ({ state }) => {
        await mailer.send(state.userId);
      } 
    }
  ]
});

await onboarding.start({ email: "hello@example.com" });
```

## 3. Implementation Details
- **Storage:** Default to File System (JSON). Pluggable for Redis/SQL later.
- **State Management:** Each step's return value is merged into a persistent `state` object.
- **Auto-Resume:** If enabled in config, the workflow will check for incomplete runs on startup/instantiation.

## 4. Tech Stack
- **Language:** TypeScript
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

- **`src/index.ts` (Public Facade):** The single entry point. It exports the factory function and standard storage providers. It ensures users have a clean API without reaching into internals.

- **`src/core/engine.ts` (Orchestrator):** The brain of the package. It handles the execution loop, manages the transition between steps, merges state, and triggers checkpoints. It is designed to be "stateless" by relying on the storage provider for its memory.

- **`src/storage/file-storage.ts` (Persistence):** Implements the `StorageProvider` interface using the Node.js file system. It handles atomic-like writes to JSON files to ensure data isn't corrupted during a crash.

- **`src/types/index.ts` (Contracts):** Defines the strict TypeScript interfaces. This ensures that the engine and storage providers speak the same language and provides developers with precise IntelliSense.



## 6. Knowledge Base & Logic

- **Checkpointing:** Before and after every step, the `WorkflowRunState` is persisted. This ensures that if the process dies *during* a step, it restarts *that same step* (idempotency is the user's responsibility).



- **State Persistence:** The `state` object is an accumulator. Every step's return value (if an object) is merged into it. Non-object returns are keyed as `step_{name}_result`.

- **Run Tracking:** Every execution gets a `runId`. This is the "key" to resuming.

- **Auto-Resume:** Background process that scans the storage for `pending` statuses and re-triggers the `run` loop.



## 6. Implementation Strategy: Result Pattern

Instead of `try/catch` and throwing errors, we will move to a Result pattern:

```ts

type WorkflowResult<T> = 

  | { success: true; data: T; runId: string }

  | { success: false; error: string; runId: string; step: string };

```

*Why?*

1. **Predictability:** The user doesn't need `try/catch` blocks everywhere.

2. **Performance:** Avoiding stack trace generation for "expected" failures (like API timeouts).

3. **Type Safety:** TypeScript can enforce checking the `success` flag.



## 7. Development Progress

- [x] Project initialization.

- [x] Core engine implementation (Error-based).

- [x] File System storage provider.

- [ ] Implement Result Pattern (Refactor from Errors).

- [ ] Improve State Merging logic.

- [ ] Create README.md.
