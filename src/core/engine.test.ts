import fs from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorage } from '../storage/file-storage';
import { createWorkflow } from './engine';

describe('Resumable Workflow', () => {
  const storageDir = '.test-runs';

  beforeEach(async () => {
    try {
      await fs.rm(storageDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  it('should execute all steps successfully', async () => {
    const step1 = vi.fn().mockResolvedValue({ user: 1 });
    const step2 = vi.fn().mockResolvedValue({ emailSent: true });

    const workflow = createWorkflow({
      id: 'test-wf',
      storage: new FileStorage(storageDir),
      steps: [
        { name: 'step1', run: step1 },
        { name: 'step2', run: step2 },
      ],
    });

    const response = await workflow.start({ name: 'test' });

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.result).toEqual({ user: 1, emailSent: true });
    }
    expect(step1).toHaveBeenCalled();
    expect(step2).toHaveBeenCalled();
  });

  it('should return failure result on crash and resume successfully', async () => {
    let callCount = 0;
    const failingStep = async () => {
      callCount++;
      // Biome wants an await in async functions
      await Promise.resolve();
      if (callCount === 1) {
        throw new Error('Simulated Crash');
      }
      return { fixed: true };
    };

    const workflow = createWorkflow({
      id: 'resume-wf',
      storage: new FileStorage(storageDir),
      steps: [
        { name: 'step1', run: async () => ({ step1: 'done' }) },
        { name: 'failing-step', run: failingStep },
      ],
    });

    // First attempt - fails with Result pattern
    const response1 = await workflow.start({});

    expect(response1.success).toBe(false);
    if (!response1.success) {
      expect(response1.error).toBe('Simulated Crash');
      expect(response1.stepName).toBe('failing-step');

      // Second attempt - resumes using the runId from the failed result
      const response2 = await workflow.resume(response1.runId);
      expect(response2.success).toBe(true);
      if (response2.success) {
        expect(response2.result).toEqual({ step1: 'done', fixed: true });
      }
      expect(callCount).toBe(2);
    }
  });

  it('should auto-cleanup run data after success when enabled', async () => {
    const step1 = vi.fn().mockResolvedValue({ done: true });
    const storage = new FileStorage(storageDir);

    const workflow = createWorkflow({
      id: 'cleanup-wf',
      storage,
      autoCleanup: true,
      steps: [{ name: 'step1', run: step1 }],
    });

    const response = await workflow.start({});

    expect(response.success).toBe(true);

    if (response.success) {
      // Check if file exists
      const run = await storage.getRun(response.runId);
      expect(run).toBeNull();
    }
  });

  it('should manually clear completed runs', async () => {
    const step1 = vi.fn().mockResolvedValue({ done: true });
    const storage = new FileStorage(storageDir);

    const workflow = createWorkflow({
      id: 'manual-cleanup-wf',
      storage,
      autoCleanup: false, // keep them first
      steps: [{ name: 'step1', run: step1 }],
    });

    // Create two completed runs
    const run1 = await workflow.start({ id: 1 });
    const run2 = await workflow.start({ id: 2 });

    expect(run1.success).toBe(true);
    expect(run2.success).toBe(true);

    // Verify they exist
    const completedBefore =
      await storage.listCompletedRuns('manual-cleanup-wf');
    expect(completedBefore.length).toBe(2);

    // Clear them
    await workflow.clearCompleted();

    // Verify they are gone
    const completedAfter = await storage.listCompletedRuns('manual-cleanup-wf');
    expect(completedAfter.length).toBe(0);
  });
});
