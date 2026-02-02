import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, WorkflowRunState } from '../types';

export class FileStorage implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir = '.resumable-workflow') {
    this.baseDir = path.resolve(baseDir);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private getFilePath(runId: string): string {
    return path.join(this.baseDir, `${runId}.json`);
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
    try {
      const data = await fs.readFile(this.getFilePath(runId), 'utf-8');
      return JSON.parse(data) as WorkflowRunState<
        unknown,
        Record<string, unknown>
      >;
    } catch (_e) {
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
        if (file.endsWith('.json')) {
          try {
            const data = await fs.readFile(
              path.join(this.baseDir, file),
              'utf-8'
            );
            const run = JSON.parse(data) as WorkflowRunState<
              unknown,
              Record<string, unknown>
            >;
            if (run.workflowId === workflowId && run.status === status) {
              runs.push(run);
            }
          } catch (_e) {
            // Ignore corrupted files
          }
        }
      }
      return runs;
    } catch (_e) {
      return [];
    }
  }

  async deleteRun(runId: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(runId));
    } catch (_e) {
      // Ignore if file doesn't exist
    }
  }
}
