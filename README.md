# Resumable Workflow

A lightweight, framework-agnostic Node.js library to ensure multi-step processes survive server crashes. It uses a declarative functional API and checkpoints progress to persistent storage after every step.

## Features
- **Checkpointing:** Automatically saves state after each successful step.
- **Resumable:** Easily resume failed or interrupted runs by ID.
- **Result Pattern:** Returns descriptive objects instead of throwing errors for better control and performance.
- **Auto-Resume:** Optional background resumption of incomplete tasks on startup.
- **Auto-Cleanup:** Optional automatic deletion of run data upon successful completion.
- **Pluggable Storage:** Default file-system storage included, with interfaces for Redis or SQL.

## Architecture

The library is split into three main parts:
1. **The Engine (`src/core`):** Manages the execution loop and ensures that steps are called in order.
2. **Storage Providers (`src/storage`):** Handles the physical saving and loading of the workflow state.
3. **Types (`src/types`):** Provides strict generic support so your input and output data are always type-safe.

## Installation
```bash
pnpm add resumable-workflow
```

## Usage

### 1. Define and Start a Workflow
```typescript
import { createWorkflow } from 'resumable-workflow';

const onboarding = createWorkflow({
  id: 'user-onboarding',
  autoCleanup: true, // Optional: Automatically delete data after success
  steps: [
    {
      name: 'create-user',
      run: async ({ input }) => {
        // Logic to create user
        return { userId: '123' }; // Merged into state
      }
    },
// ...
  ]
});

// ...
```

### 2. Manual Cleanup
You can also manually clear all completed runs for a workflow:
```typescript
await onboarding.clearCompleted();
```

### 3. Resume a Failed Run
    {
      name: 'send-welcome-email',
      run: async ({ state }) => {
        // Access state.userId from previous step
        await mailer.send(state.userId);
        return { emailSent: true };
      }
    }
  ]
});

const response = await onboarding.start({ email: 'user@example.com' });

if (response.success) {
  console.log('Workflow finished:', response.result);
} else {
  console.error('Workflow failed at:', response.stepName, 'Error:', response.error);
  // You can store response.runId to resume later
}
```

### 2. Resume a Failed Run
```typescript
const response = await onboarding.resume(failedRunId);
```

### 3. Auto-Resume on Startup
```typescript
const workflow = createWorkflow({
  id: 'critical-process',
  autoResume: true, // Will automatically scan and resume pending tasks
  steps: [...]
});
```

## API

### `createWorkflow(config)`
Returns an engine with `start`, `resume`, `listIncomplete`, and `resumeAllIncomplete`.

#### Config:
- `id`: Unique string identifying the workflow.
- `steps`: Array of step objects `{ name, run }`.
- `autoResume`: (Optional) Boolean.
- `storage`: (Optional) Custom storage provider.

### The Result Object
All execution methods return a `WorkflowResult`:
- **Success:** `{ success: true, result: T, runId: string }`
- **Failure:** `{ success: false, error: string, runId: string, stepName: string }`

## Development & Release

### Workflow for Changes
1. Make your changes.
2. Run `pnpm changeset` and follow the prompts to describe your change.
3. Commit the generated changeset file.

### CI/CD
This project uses **GitHub Actions** for CI. Every pull request is automatically:
- Linted with Biome
- Built with tsup
- Tested with Vitest

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on how to set up the project, our coding standards, and the pull request process.

## License
MIT
