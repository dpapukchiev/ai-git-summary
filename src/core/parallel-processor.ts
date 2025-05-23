import PQueue from "p-queue";
import { SimpleGit } from "simple-git";
import { CommitProcessor } from "./commit-processor";
import { log } from "../utils/logger";

interface ProcessingResult {
  successful: number;
  failed: number;
  totalTime: number;
}

export class ParallelProcessor {
  private queue: PQueue;
  private concurrency: number;

  constructor(concurrency: number = 5) {
    this.concurrency = concurrency;
    this.queue = new PQueue({
      concurrency: this.concurrency,
      timeout: 60000, // 60 second timeout per operation
      throwOnTimeout: true,
    });
  }

  async processCommitsInParallel(
    git: SimpleGit,
    repoId: number,
    commits: readonly any[],
    commitProcessor: CommitProcessor
  ): Promise<ProcessingResult> {
    log.output(
      `Processing commits with concurrency: ${this.concurrency}`,
      "parallel-processor"
    );

    const startTime = Date.now();
    let processed = 0;

    const commitTasks = commits.map((commit, index) =>
      this.queue.add(async () => {
        log.debug(
          `Processing commit: ${commit?.hash} (${index + 1}/${commits.length})`,
          "parallel-processor"
        );

        try {
          await commitProcessor.processCommit(git, repoId, commit);
          processed++;

          this.logProgress(processed, commits.length, startTime);
        } catch (error) {
          log.error(
            `Failed to process commit ${commit?.hash}`,
            error as Error,
            "parallel-processor"
          );
          throw error;
        }
      })
    );

    const results = await Promise.allSettled(commitTasks);
    const totalTime = (Date.now() - startTime) / 1000;

    return this.calculateResults(results, commits.length, totalTime);
  }

  private logProgress(
    processed: number,
    total: number,
    startTime: number
  ): void {
    if (processed % 10 === 0 || processed === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      log.output(
        `✓ Processed ${processed}/${total} commits (${rate.toFixed(1)} commits/sec)`,
        "parallel-processor"
      );
    }
  }

  private calculateResults(
    results: PromiseSettledResult<void>[],
    totalCommits: number,
    totalTime: number
  ): ProcessingResult {
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    this.logFinalResults(totalCommits, totalTime, successful, failed);

    return {
      successful,
      failed,
      totalTime,
    };
  }

  private logFinalResults(
    totalCommits: number,
    totalTime: number,
    successful: number,
    failed: number
  ): void {
    log.output(
      `🎉 Completed processing ${totalCommits} commits in ${totalTime.toFixed(1)}s`,
      "parallel-processor"
    );
    log.output(
      `✅ Successful: ${successful}, ❌ Failed: ${failed}`,
      "parallel-processor"
    );

    if (failed > 0) {
      log.output(
        `⚠️  ${failed} commits failed to process. Check logs above for details.`,
        "parallel-processor"
      );
    }
  }

  async cleanup(): Promise<void> {
    log.output("🧹 Cleaning up queue...", "parallel-processor");
    this.queue.clear();
    await this.queue.onIdle();
    log.output("✅ Queue cleanup completed", "parallel-processor");
  }

  getQueueStatus(): { size: number; pending: number; isPaused: boolean } {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
    };
  }
}
