import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { FileStorage } from './file-storage';

describe('FileStorage', () => {
  const storageDir = '.test-runs-storage';

  beforeEach(async () => {
    try {
      await fs.rm(storageDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  describe('path traversal prevention', () => {
    it('should reject runIds with "../" path traversal attempts', async () => {
      const storage = new FileStorage(storageDir);
      const maliciousRunId = '../../../etc/passwd';

      await expect(storage.getRun(maliciousRunId)).rejects.toThrow(
        'Invalid runId: Path traversal detected'
      );
    });

    it('should reject runIds with "..\\" path traversal attempts', async () => {
      const storage = new FileStorage(storageDir);
      const maliciousRunId = '..\\..\\..\\windows\\system32';

      await expect(storage.getRun(maliciousRunId)).rejects.toThrow(
        'Invalid runId: Path traversal detected'
      );
    });

    it('should reject runIds that start with ".."', async () => {
      const storage = new FileStorage(storageDir);
      const maliciousRunId = '..malicious-file';

      await expect(storage.getRun(maliciousRunId)).rejects.toThrow(
        'Invalid runId: Path traversal detected'
      );
    });

    it('should reject runIds with invalid characters', async () => {
      const storage = new FileStorage(storageDir);
      const invalidRunId = 'run_id_with_invalid<char>';

      await expect(storage.getRun(invalidRunId)).rejects.toThrow(
        'Invalid runId: Only alphanumeric characters, hyphens, and underscores are allowed'
      );
    });

    it('should accept valid runIds', async () => {
      const storage = new FileStorage(storageDir);
      const validRunId = 'valid-run_id123';

      // This should not throw
      await expect(storage.getRun(validRunId)).resolves.toBeNull();
    });

    it('should properly validate runId in saveRun method', async () => {
      const storage = new FileStorage(storageDir);
      const maliciousRunId = '../../../secret-file';

      const runState = {
        workflowId: 'test-workflow',
        runId: maliciousRunId,
        status: 'pending' as const,
        currentStepIndex: 0,
        input: {},
        state: {},
      };

      await expect(storage.saveRun(runState)).rejects.toThrow(
        'Invalid runId: Path traversal detected'
      );
    });

    it('should properly validate runId in deleteRun method', async () => {
      const storage = new FileStorage(storageDir);
      const maliciousRunId = '../../../delete-me';

      await expect(storage.deleteRun(maliciousRunId)).rejects.toThrow(
        'Invalid runId: Path traversal detected'
      );
    });

    it('should ensure resolved path stays within base directory', async () => {
      const storage = new FileStorage(storageDir);
      const runState = {
        workflowId: 'test-workflow',
        runId: 'test-run',
        status: 'pending' as const,
        currentStepIndex: 0,
        input: {},
        state: {},
      };

      // Save a valid run
      await storage.saveRun(runState);

      // Verify it was saved in the correct location
      const savedFilePath = path.join(storageDir, 'test-run.json');
      const stats = await fs.stat(savedFilePath);
      expect(stats.isFile()).toBe(true);

      // Verify the file is accessible via getRun
      const retrievedRun = await storage.getRun('test-run');
      expect(retrievedRun).not.toBeNull();
      expect(retrievedRun?.runId).toBe('test-run');
    });

    it('should handle edge cases for path traversal', async () => {
      const storage = new FileStorage(storageDir);

      // Test various path traversal patterns
      const traversalAttempts = [
        '../../../../../../../etc/passwd',
        '..\\..\\..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
        '..%2fetc%2fpasswd', // Mixed encoding
        '..././../etc/passwd', // Dots in unusual pattern
        '....//etc/passwd', // Multiple dots followed by slash
      ];

      for (const attempt of traversalAttempts) {
        await expect(storage.getRun(attempt)).rejects.toThrow();
      }
    });
  });

  describe('normal operations', () => {
    it('should save and retrieve run data correctly', async () => {
      const storage = new FileStorage(storageDir);
      const runState = {
        workflowId: 'test-workflow',
        runId: 'test-run-123',
        status: 'pending' as const,
        currentStepIndex: 0,
        input: { test: 'data' },
        state: { step1: 'completed' },
      };

      await storage.saveRun(runState);
      const retrievedRun = await storage.getRun('test-run-123');

      expect(retrievedRun).toEqual(runState);
    });

    it('should return null for non-existent runs', async () => {
      const storage = new FileStorage(storageDir);
      const nonExistentRun = await storage.getRun('non-existent-run');

      expect(nonExistentRun).toBeNull();
    });

    it('should list incomplete runs correctly', async () => {
      const storage = new FileStorage(storageDir);

      const runState1 = {
        workflowId: 'test-workflow',
        runId: 'incomplete-run-1',
        status: 'pending' as const,
        currentStepIndex: 0,
        input: { test: 'data' },
        state: { step1: 'started' },
      };

      const runState2 = {
        workflowId: 'test-workflow',
        runId: 'completed-run-1',
        status: 'completed' as const,
        currentStepIndex: 2,
        input: { test: 'data' },
        state: { step1: 'completed', step2: 'completed' },
      };

      await storage.saveRun(runState1);
      await storage.saveRun(runState2);

      const incompleteRuns = await storage.listIncompleteRuns('test-workflow');
      expect(incompleteRuns).toHaveLength(1);
      expect(incompleteRuns[0].runId).toBe('incomplete-run-1');
      expect(incompleteRuns[0].status).toBe('pending');
    });

    it('should list completed runs correctly', async () => {
      const storage = new FileStorage(storageDir);

      const runState1 = {
        workflowId: 'test-workflow',
        runId: 'incomplete-run-1',
        status: 'pending' as const,
        currentStepIndex: 0,
        input: { test: 'data' },
        state: { step1: 'started' },
      };

      const runState2 = {
        workflowId: 'test-workflow',
        runId: 'completed-run-1',
        status: 'completed' as const,
        currentStepIndex: 2,
        input: { test: 'data' },
        state: { step1: 'completed', step2: 'completed' },
      };

      await storage.saveRun(runState1);
      await storage.saveRun(runState2);

      const completedRuns = await storage.listCompletedRuns('test-workflow');
      expect(completedRuns).toHaveLength(1);
      expect(completedRuns[0].runId).toBe('completed-run-1');
      expect(completedRuns[0].status).toBe('completed');
    });

    it('should delete runs correctly', async () => {
      const storage = new FileStorage(storageDir);

      const runState = {
        workflowId: 'test-workflow',
        runId: 'deletable-run',
        status: 'pending' as const,
        currentStepIndex: 0,
        input: { test: 'data' },
        state: { step1: 'started' },
      };

      // Save the run
      await storage.saveRun(runState);
      let retrievedRun = await storage.getRun('deletable-run');
      expect(retrievedRun).not.toBeNull();

      // Delete the run
      await storage.deleteRun('deletable-run');
      retrievedRun = await storage.getRun('deletable-run');
      expect(retrievedRun).toBeNull();
    });

    it('should handle concurrent operations safely', async () => {
      const storage = new FileStorage(storageDir);

      // Create multiple run states
      const runStates = Array.from({ length: 5 }, (_, i) => ({
        workflowId: 'concurrent-workflow',
        runId: `run-${i}`,
        status: 'pending' as const,
        currentStepIndex: 0,
        input: { id: i },
        state: { step: 'initial' },
      }));

      // Save all runs concurrently
      await Promise.all(runStates.map((state) => storage.saveRun(state)));

      // Retrieve all runs concurrently
      const retrievedRuns = await Promise.all(
        runStates.map((state) => storage.getRun(state.runId))
      );

      expect(retrievedRuns).toHaveLength(5);
      retrievedRuns.forEach((run, i) => {
        expect(run).not.toBeNull();
        expect(run?.input).toEqual({ id: i });
      });
    });
  });
});
