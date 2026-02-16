# resumable-workflow

## 1.4.2

### Patch Changes

- Release security hardening updates for workflow logging and file storage run enumeration validation.

## 1.4.1

### Patch Changes

- Add comprehensive path-traversal prevention tests for `FileStorage`, including multiple traversal vectors and validation coverage for save/get/delete operations.

## 1.4.0

### Minor Changes

- Initial release with class-based architecture, auto-cleanup, and strict typing.

## 1.3.1

### Patch Changes

- resolve linting error in clearIncomplete method

## 1.3.0

### Minor Changes

- 28ee926: Add clearIncomplete method to Workflow class

## 1.2.2

### Patch Changes

- 5cbcb0a: Sync CI/CD pipeline with official changesets action

## 1.2.1

### Patch Changes

- Refine CI/CD pipeline configuration to resolve pnpm version conflicts and ensure stable automated

## 1.2.0

### Minor Changes

- Add getRun method to Workflow class to retrieve specific run states by ID

## 1.1.3

### Patch Changes

- Add repository, bugs, homepage and exports

## 1.1.2

### Patch Changes

- Add repository, bugs, homepage and exports… (Focused) │

## 1.1.1

### Patch Changes

- Reset status to pending when resuming"… │

## 1.1.0

### Minor Changes

- a9f787d: Check on run status if "pending" | "failed" instead only "pending" in listIncompleteRuns()
