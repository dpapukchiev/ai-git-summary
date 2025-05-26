import PQueue from 'p-queue';

/**
 * Utility for processing items in parallel with configurable concurrency using p-queue
 */
export interface ProcessResult {
  success: boolean;
  error?: Error | unknown;
}

export interface ParallelProcessingResult<T> {
  completed: number;
  failed: number;
  errors: Array<{ item: T; error: Error | unknown }>;
}

export type ProgressCallback<T> = (
  completed: number,
  total: number,
  item: T,
  success: boolean
) => void;

export interface ParallelProcessingOptions {
  concurrency?: number;
  timeout?: number;
  throwOnTimeout?: boolean;
}

/**
 * Process items in parallel with configurable concurrency using p-queue
 */
export async function processInParallel<T>(
  items: T[],
  processor: (item: T) => Promise<ProcessResult>,
  concurrency: number = 3,
  progressCallback?: ProgressCallback<T>
): Promise<ParallelProcessingResult<T>> {
  return processInParallelWithOptions(
    items,
    processor,
    { concurrency },
    progressCallback
  );
}

/**
 * Process items in parallel with full configuration options
 */
async function processInParallelWithOptions<T>(
  items: T[],
  processor: (item: T) => Promise<ProcessResult>,
  options: ParallelProcessingOptions = {},
  progressCallback?: ProgressCallback<T>
): Promise<ParallelProcessingResult<T>> {
  const {
    concurrency = 3,
    timeout = 60000, // 60 seconds default
    throwOnTimeout = false,
  } = options;

  const queue = new PQueue({
    concurrency,
    timeout,
    throwOnTimeout,
  });

  const results: ParallelProcessingResult<T> = {
    completed: 0,
    failed: 0,
    errors: [],
  };

  // Create tasks for all items
  const tasks = items.map(item =>
    queue.add(async () => {
      try {
        const result = await processor(item);
        if (result.success) {
          results.completed++;
          progressCallback?.(
            results.completed + results.failed,
            items.length,
            item,
            true
          );
        } else {
          results.failed++;
          results.errors.push({ item, error: result.error });
          progressCallback?.(
            results.completed + results.failed,
            items.length,
            item,
            false
          );
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ item, error });
        progressCallback?.(
          results.completed + results.failed,
          items.length,
          item,
          false
        );
      }
    })
  );

  // Wait for all tasks to complete
  await Promise.allSettled(tasks);

  return results;
}
