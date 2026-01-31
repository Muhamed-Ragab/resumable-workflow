import { randomUUID } from 'node:crypto';
import { FileStorage } from '../storage/file-storage';
import type {
  StorageProvider,
  WorkflowConfig,
  WorkflowResult,
  WorkflowRunState,
  WorkflowStatus,
} from '../types';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export class Workflow<
  TInput = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  private readonly storage: StorageProvider;
  private readonly workflowId: string;
  private readonly config: WorkflowConfig<TInput, TState>;

  constructor(config: WorkflowConfig<TInput, TState>) {
    this.config = config;
    this.storage = config.storage || new FileStorage();
    this.workflowId = config.id;

    if (config.autoResume) {
      this.resumeAllIncomplete().catch((err) => {
        console.error(
          `[ResumableWorkflow: ${this.workflowId}] Auto-resume failed:`,
          err
        );
      });
    }
  }

  private async executeStep(
    currentState: Mutable<WorkflowRunState<TInput, TState>>,
    stepIndex: number
  ): Promise<void> {
    const step = this.config.steps[stepIndex];
    if (!step) {
      return;
    }

    try {
      const result = await step.run({
        input: currentState.input,
        state: currentState.state,
      });

      if (
        result !== null &&
        typeof result === 'object' &&
        !Array.isArray(result)
      ) {
        currentState.state = {
          ...currentState.state,
          ...(result as Partial<TState>),
        };
      } else if (result !== undefined) {
        (currentState.state as Record<string, unknown>)[
          step.name || `step_${stepIndex}`
        ] = result;
      }

      currentState.currentStepIndex = stepIndex + 1;

      if (currentState.currentStepIndex === this.config.steps.length) {
        currentState.status = 'completed';
      }

      await this.storage.saveRun(currentState);
    } catch (error) {
      currentState.status = 'failed';
      currentState.error =
        error instanceof Error ? error.message : String(error);
      await this.storage.saveRun(currentState);
      throw error;
    }
  }

  private async run(
    input: TInput,
    existingRun?: WorkflowRunState<TInput, TState>
  ): Promise<WorkflowResult<TState>> {
    const runId = existingRun?.runId || randomUUID();
    const currentState: Mutable<WorkflowRunState<TInput, TState>> =
      (existingRun as Mutable<WorkflowRunState<TInput, TState>>) || {
        workflowId: this.workflowId,
        runId,
        status: 'pending' as WorkflowStatus,
        currentStepIndex: 0,
        input,
        state: {} as TState,
      };

    // If resuming a failed/halted run, reset its status to pending
    if (existingRun && existingRun.status !== 'completed') {
      currentState.status = 'pending';
    }

    if (!existingRun) {
      await this.storage.saveRun(currentState);
    }

    try {
      for (
        let i = currentState.currentStepIndex;
        i < this.config.steps.length;
        i++
      ) {
        await this.executeStep(currentState, i);
      }
    } catch (_error) {
      return {
        success: false,
        error: currentState.error || 'Unknown error',
        runId: currentState.runId,
        stepName:
          this.config.steps[currentState.currentStepIndex]?.name ||
          `step_${currentState.currentStepIndex}`,
      };
    }

    return {
      success: true,
      result: currentState.state,
      runId: currentState.runId,
    };
  }

  start(input: TInput): Promise<WorkflowResult<TState>> {
    return this.run(input);
  }

  async resume(runId: string): Promise<WorkflowResult<TState>> {
    const runState = await this.storage.getRun(runId);
    if (!runState) {
      return {
        success: false,
        error: `Run ${runId} not found`,
        runId,
        stepName: 'unknown',
      };
    }
    if (runState.status === 'completed') {
      return {
        success: true,
        result: runState.state as TState,
        runId: runState.runId,
      };
    }
    return this.run(
      runState.input as TInput,
      runState as WorkflowRunState<TInput, TState>
    );
  }

  listIncomplete(): Promise<
    WorkflowRunState<unknown, Record<string, unknown>>[]
  > {
    return this.storage.listIncompleteRuns(this.workflowId);
  }

  async resumeAllIncomplete(): Promise<WorkflowResult<TState>[]> {
    const incomplete = await this.storage.listIncompleteRuns(this.workflowId);
    return Promise.all(
      incomplete.map((runState) =>
        this.run(
          runState.input as TInput,
          runState as WorkflowRunState<TInput, TState>
        )
      )
    );
  }
}

/**
 * Factory function for backward compatibility and ease of use
 */
export function createWorkflow<
  TInput = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(config: WorkflowConfig<TInput, TState>) {
  return new Workflow(config);
}
