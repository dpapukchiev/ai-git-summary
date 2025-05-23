import { DateUtils } from "../utils/date-utils";
import { log } from "../utils/logger";

/**
 * Helper function to find most productive day
 */
function getMostProductiveDay(commits: any[]): string {
  if (!commits || commits.length === 0) return "N/A";

  const dayCommits = new Map<string, number>();
  commits.forEach((commit) => {
    const day = DateUtils.formatDate(commit.date);
    dayCommits.set(day, (dayCommits.get(day) || 0) + 1);
  });

  let maxDay = "";
  let maxCommits = 0;
  for (const [day, count] of dayCommits) {
    if (count > maxCommits) {
      maxCommits = count;
      maxDay = day;
    }
  }

  return `${maxDay} (${maxCommits} commits)`;
}

/**
 * Print detailed text summary to console
 */
export function printTextSummary(summary: any, verbose = false) {
  log.output(`\n📊 Work Summary: ${summary.period.label}\n`, "text-formatter");
  log.output(
    `Period: ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}`,
    "text-formatter"
  );
  log.output(
    `Repositories: ${summary.repositories.length}\n`,
    "text-formatter"
  );

  // Overall stats with more context
  log.output("📈 Overall Statistics:", "text-formatter");
  log.output(
    `  Commits: ${summary.stats.totalCommits.toLocaleString()}`,
    "text-formatter"
  );
  log.output(
    `  Files Changed: ${summary.stats.totalFilesChanged.toLocaleString()}`,
    "text-formatter"
  );
  log.output(
    `  Lines Added: +${summary.stats.totalInsertions.toLocaleString()}`,
    "text-formatter"
  );
  log.output(
    `  Lines Deleted: -${summary.stats.totalDeletions.toLocaleString()}`,
    "text-formatter"
  );
  const netChange =
    summary.stats.totalInsertions - summary.stats.totalDeletions;
  log.output(
    `  Net Change: ${netChange > 0 ? "+" : ""}${netChange.toLocaleString()} lines`,
    "text-formatter"
  );
  log.output(`  Active Days: ${summary.stats.activeDays}`, "text-formatter");
  log.output(
    `  Average Commits/Day: ${summary.stats.averageCommitsPerDay}`,
    "text-formatter"
  );

  // Productivity metrics
  const linesPerCommit =
    summary.stats.totalCommits > 0
      ? Math.round(
          (summary.stats.totalInsertions + summary.stats.totalDeletions) /
            summary.stats.totalCommits
        )
      : 0;
  const commitFrequency =
    summary.stats.activeDays > 0
      ? (summary.stats.totalCommits / summary.stats.activeDays).toFixed(1)
      : "0";
  log.output(
    `  Lines Changed/Commit: ${linesPerCommit.toLocaleString()}`,
    "text-formatter"
  );
  log.output(`  Commits/Active Day: ${commitFrequency}\n`, "text-formatter");

  // Time-based patterns - declare variables with proper scope
  let workingHoursPercent = 0;
  let weekendPercent = 0;

  if (summary.commits && summary.commits.length > 0) {
    const workingHoursCommits = summary.commits.filter((c: any) =>
      DateUtils.isWorkingHours(c.date)
    ).length;
    const weekendCommits = summary.commits.filter((c: any) =>
      DateUtils.isWeekend(c.date)
    ).length;
    workingHoursPercent =
      summary.commits.length > 0
        ? Math.round((workingHoursCommits / summary.commits.length) * 100)
        : 0;
    weekendPercent =
      summary.commits.length > 0
        ? Math.round((weekendCommits / summary.commits.length) * 100)
        : 0;

    log.output("⏰ Time Patterns:", "text-formatter");
    log.output(
      `  Working Hours (9-18): ${workingHoursCommits} commits (${workingHoursPercent}%)`,
      "text-formatter"
    );
    log.output(
      `  Weekend Commits: ${weekendCommits} commits (${weekendPercent}%)`,
      "text-formatter"
    );
    log.output(
      `  After Hours: ${summary.commits.length - workingHoursCommits} commits (${100 - workingHoursPercent}%)\n`,
      "text-formatter"
    );
  }

  // Commit size analysis
  if (summary.commits && summary.commits.length > 0) {
    const commitSizes = summary.commits.map(
      (c: any) => c.insertions + c.deletions
    );
    commitSizes.sort((a: number, b: number) => a - b);
    const median = commitSizes[Math.floor(commitSizes.length / 2)] || 0;
    const smallCommits = commitSizes.filter(
      (size: number) => size <= 50
    ).length;
    const mediumCommits = commitSizes.filter(
      (size: number) => size > 50 && size <= 200
    ).length;
    const largeCommits = commitSizes.filter(
      (size: number) => size > 200
    ).length;

    log.output("📏 Commit Sizes:", "text-formatter");
    log.output(`  Median lines changed: ${median}`, "text-formatter");
    log.output(
      `  Small commits (≤50 lines): ${smallCommits} (${Math.round((smallCommits / summary.commits.length) * 100)}%)`,
      "text-formatter"
    );
    log.output(
      `  Medium commits (51-200 lines): ${mediumCommits} (${Math.round((mediumCommits / summary.commits.length) * 100)}%)`,
      "text-formatter"
    );
    log.output(
      `  Large commits (>200 lines): ${largeCommits} (${Math.round((largeCommits / summary.commits.length) * 100)}%)\n`,
      "text-formatter"
    );
  }

  // Top languages with percentages
  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    const totalChanges = summary.stats.topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    log.output("💻 Top Languages:", "text-formatter");
    for (const lang of summary.stats.topLanguages.slice(0, 8)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      const bar = "█".repeat(Math.max(1, Math.round(percentage / 5)));
      log.output(
        `  ${lang.language.padEnd(12)} ${lang.changes.toLocaleString().padStart(6)} changes (${percentage}%) ${bar}`,
        "text-formatter"
      );
    }
    log.output("", "text-formatter");
  }

  // Enhanced repository breakdown for verbose mode
  if (verbose && summary.repositories.length > 1) {
    log.output("📁 Repository Breakdown:", "text-formatter");
    for (const repo of summary.repositories) {
      const repoCommits = summary.commits
        ? summary.commits.filter((c: any) => c.repoId === repo.id).length
        : 0;
      const repoLines = summary.commits
        ? summary.commits
            .filter((c: any) => c.repoId === repo.id)
            .reduce(
              (sum: number, c: any) => sum + c.insertions + c.deletions,
              0
            )
        : 0;

      log.output(`  📂 ${repo.name}`, "text-formatter");
      log.output(`     ${repo.path}`, "text-formatter");
      log.output(
        `     ${repoCommits} commits, ${repoLines.toLocaleString()} lines changed`,
        "text-formatter"
      );
      if (repo.remoteUrl) {
        log.output(`     🔗 ${repo.remoteUrl}`, "text-formatter");
      }
    }
    log.output("", "text-formatter");
  }

  // Top files with more context
  if (verbose && summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    log.output("📄 Most Active Files:", "text-formatter");
    for (const file of summary.stats.topFiles.slice(0, 12)) {
      const activity = file.changes === 1 ? "change" : "changes";
      log.output(
        `  📝 ${file.file} (${file.changes} ${activity})`,
        "text-formatter"
      );
    }
    log.output("", "text-formatter");
  }

  // Activity streak analysis
  if (summary.commits && summary.commits.length > 0) {
    const commitDays = [
      ...new Set(summary.commits.map((c: any) => DateUtils.formatDate(c.date))),
    ].sort();
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate: Date | null = null;

    for (const day of commitDays) {
      const date = new Date(day as string);
      if (lastDate) {
        const daysDiff = Math.round(
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastDate = date;
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    log.output("🔥 Activity Insights:", "text-formatter");
    log.output(
      `  Longest streak: ${maxStreak} consecutive days`,
      "text-formatter"
    );
    log.output(
      `  Most productive day: ${getMostProductiveDay(summary.commits)}`,
      "text-formatter"
    );
    log.output(
      `  Consistency score: ${Math.round((summary.stats.activeDays / DateUtils.getDaysInPeriod(summary.period.startDate, summary.period.endDate)) * 100)}%\n`,
      "text-formatter"
    );
  }

  // Weekly activity pattern (simple ASCII chart)
  if (verbose && summary.commits && summary.commits.length > 0) {
    log.output("📅 Weekly Activity Pattern:", "text-formatter");
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCommits = new Array(7).fill(0);

    summary.commits.forEach((commit: any) => {
      dayCommits[commit.date.getDay()]++;
    });

    const maxDayCommits = Math.max(...dayCommits);
    for (let i = 0; i < 7; i++) {
      const count = dayCommits[i];
      const percentage =
        maxDayCommits > 0 ? Math.round((count / maxDayCommits) * 100) : 0;
      const bar =
        "▓".repeat(Math.max(1, Math.round(percentage / 10))) +
        "░".repeat(Math.max(0, 10 - Math.round(percentage / 10)));
      log.output(
        `  ${dayNames[i]} │${bar}│ ${count} commits`,
        "text-formatter"
      );
    }
    log.output("", "text-formatter");
  }

  // Summary and achievements
  log.output("🏆 Summary & Achievements:", "text-formatter");
  const achievements = [];

  if (summary.stats.totalCommits >= 100)
    achievements.push("💯 Century Club - 100+ commits!");
  if (summary.stats.totalCommits >= 50)
    achievements.push("⭐ Consistent Contributor - 50+ commits!");
  if (summary.stats.activeDays >= 20)
    achievements.push("📅 Regular Committer - 20+ active days!");
  if (summary.stats.totalInsertions >= 10000)
    achievements.push("📝 Code Creator - 10K+ lines added!");
  if (
    summary.stats.activeDays > 0 &&
    summary.stats.totalCommits / summary.stats.activeDays >= 5
  ) {
    achievements.push("🚀 Power User - 5+ commits per active day!");
  }
  if (workingHoursPercent >= 80) {
    achievements.push(
      "⏰ Professional Hours - 80%+ commits during work hours!"
    );
  }
  if (summary.repositories.length >= 5)
    achievements.push("🔀 Multi-tasker - Working on 5+ repositories!");

  if (achievements.length > 0) {
    achievements.forEach((achievement) =>
      log.output(`  ${achievement}`, "text-formatter")
    );
  } else {
    log.output("  Keep coding to unlock achievements! 💪", "text-formatter");
  }
  log.output("", "text-formatter");
}
