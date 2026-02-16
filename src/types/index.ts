export interface Step<
  TInput = unknown,
  TState = Record<string, unknown>,
  TOutput = unknown,
> {
  readonly name: string;
  readonly run: (context: {
    readonly input: TInput;
    readonly state: TState;
  }) => Promise<TOutput>;
}

export interface WorkflowConfig<
  TInput = unknown,
  TState = Record<string, unknown>,
> {
  readonly id: string;
  readonly steps: readonly Step<TInput, TState, unknown>[];
  readonly autoResume?: boolean;
  /**
   * If true, the workflow run data will be deleted from storage immediately upon completion.
   */
  readonly autoCleanup?: boolean;
  readonly storage?: StorageProvider;
}

export type WorkflowStatus = 'pending' | 'completed' | 'failed';

export interface WorkflowRunState<
  TInput = unknown,
  TState = Record<string, unknown>,
> {
  readonly workflowId: string;
  readonly runId: string;
  readonly status: WorkflowStatus;
  readonly currentStepIndex: number;
  readonly input: TInput;
  readonly state: TState;
  readonly error?: string;
}

export type WorkflowResult<T = Record<string, unknown>> =
  | { readonly success: true; readonly result: T; readonly runId: string }
  | {
      readonly success: false;
      readonly error: string;
      readonly runId: string;
      readonly stepName: string;
    };

export interface StorageProvider {
  saveRun(
    state: WorkflowRunState<unknown, Record<string, unknown>>
  ): Promise<void>;
  getRun(
    runId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>> | null>;
  listIncompleteRuns(
    workflowId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>>[]>;
  listCompletedRuns(
    workflowId: string
  ): Promise<WorkflowRunState<unknown, Record<string, unknown>>[]>;
  deleteRun(runId: string): Promise<void>;
}
