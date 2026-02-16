import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, WorkflowRunState } from '../types';

const RUN_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export class FileStorage implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir = '.resumable-workflow') {
    this.baseDir = path.resolve(baseDir);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private validateRunId(runId: string): void {
    if (!runId || typeof runId !== 'string') {
      throw new Error(`Invalid runId: ${runId}`);
    }

    // Check for path traversal attempts
    if (
      runId.includes('../') ||
      runId.includes('..\\') ||
      runId.startsWith('..')
    ) {
      throw new Error(`Invalid runId: Path traversal detected in ${runId}`);
    }

    // Additional validation: only allow alphanumeric, hyphens, and underscores
    if (!RUN_ID_PATTERN.test(runId)) {
      throw new Error(
        `Invalid runId: Only alphanumeric characters, hyphens, and underscores are allowed in ${runId}`
      );
    }
  }

  private getFilePath(runId: string): string {
    this.validateRunId(runId);
    const filePath = path.join(this.baseDir, `${runId}.json`);

    // Additional security check: ensure the resolved path is within the base directory
    const resolvedPath = path.resolve(filePath);
    const resolvedBaseDir = path.resolve(this.baseDir);

    if (!resolvedPath.startsWith(resolvedBaseDir)) {
      throw new Error('Invalid runId: Path traversal detected');
    }

    return resolvedPath;
  }

  private isValidRunFileName(fileName: string): boolean {
    if (!fileName.endsWith('.json')) {
      return false;
    }

    const runId = fileName.slice(0, -'.json'.length);
    return RUN_ID_PATTERN.test(runId);
  }

  private isValidWorkflowStatus(
    value: unknown
  ): value is 'pending' | 'completed' | 'failed' {
    return value === 'pending' || value === 'completed' || value === 'failed';
  }

  private isValidRunStateShape(
    run: unknown
  ): run is WorkflowRunState<unknown, Record<string, unknown>> {
    if (typeof run !== 'object' || run === null || Array.isArray(run)) {
      return false;
    }

    const candidate = run as Record<string, unknown>;
    return (
      typeof candidate.workflowId === 'string' &&
      typeof candidate.runId === 'string' &&
      RUN_ID_PATTERN.test(candidate.runId) &&
      this.isValidWorkflowStatus(candidate.status) &&
      typeof candidate.currentStepIndex === 'number' &&
      Number.isInteger(candidate.currentStepIndex) &&
      candidate.currentStepIndex >= 0 &&
      'input' in candidate &&
      typeof candidate.state === 'object' &&
      candidate.state !== null &&
      !Array.isArray(candidate.state)
    );
  }

  async saveRun(
    state: WorkflowRunState<unknown, Record<string, unknown>>
  ): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.getFilePath(state.runId),
      JSON.stringify(state, null, 2)
    );
  }

  async getRun(
    runId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>> | null> {
    // Validate runId first before attempting file operations
    this.validateRunId(runId);

    try {
      const data = await fs.readFile(this.getFilePath(runId), 'utf-8');
      return JSON.parse(data) as WorkflowRunState<
        unknown,
        Record<string, unknown>
      >;
    } catch (e) {
      // Only return null for file system errors, not validation errors
      // If it's a validation error, it should have been caught by validateRunId
      if (
        (e as Error).message.includes('Invalid runId') ||
        (e as Error).message.includes('Path traversal')
      ) {
        throw e; // Re-throw validation errors
      }
      // Return null if file doesn't exist or is invalid
      return null;
    }
  }

  listIncompleteRuns(
    workflowId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>>[]> {
    return this.listRuns(workflowId, 'pending');
  }

  listCompletedRuns(
    workflowId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>>[]> {
    return this.listRuns(workflowId, 'completed');
  }

  private async listRuns(
    workflowId: string,
    status: 'pending' | 'completed'
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>>[]> {
    try {
      await this.ensureDir();
      const files = await fs.readdir(this.baseDir);
      const runs: WorkflowRunState<unknown, Record<string, unknown>>[] = [];

      for (const file of files) {
        if (!this.isValidRunFileName(file)) {
          continue;
        }

        try {
          const data = await fs.readFile(path.join(this.baseDir, file), 'utf-8');
          const run = JSON.parse(data) as unknown;

          if (!this.isValidRunStateShape(run)) {
            continue;
          }

          if (run.runId !== file.slice(0, -'.json'.length)) {
            continue;
          }

          if (run.workflowId === workflowId && run.status === status) {
            runs.push(run);
          }
        } catch (_e) {
          // Ignore corrupted files
        }
      }
      return runs;
    } catch (_e) {
      return [];
    }
  }

  async deleteRun(runId: string): Promise<void> {
    // Validate runId first before attempting file operations
    this.validateRunId(runId);

    try {
      await fs.unlink(this.getFilePath(runId));
    } catch (e) {
      // Only ignore file system errors, not validation errors
      if (
        (e as Error).message.includes('Invalid runId') ||
        (e as Error).message.includes('Path traversal')
      ) {
        throw e; // Re-throw validation errors
      }
      // Ignore if file doesn't exist
    }
  }
}
