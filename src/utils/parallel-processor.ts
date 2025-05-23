/**
 * Utility for processing items in parallel with configurable concurrency
 */
export interface ProcessResult {
  success: boolean;
  error?: any;
}

export interface ParallelProcessingResult<T> {
  completed: number;
  failed: number;
  errors: Array<{ item: T; error: any }>;
}

export type ProgressCallback<T> = (
  completed: number,
  total: number,
  item: T,
  success: boolean
) => void;

/**
 * Process items in parallel with configurable concurrency
 */
export async function processInParallel<T>(
  items: T[],
  processor: (item: T) => Promise<ProcessResult>,
  concurrency: number = 3,
  progressCallback?: ProgressCallback<T>
): Promise<ParallelProcessingResult<T>> {
  const results: ParallelProcessingResult<T> = {
    completed: 0,
    failed: 0,
    errors: [],
  };

  const processChunk = async (chunk: T[]) => {
    const promises = chunk.map(async (item) => {
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
    });

    await Promise.all(promises);
  };

  // Process items in chunks to control concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await processChunk(chunk);
  }

  return results;
}
