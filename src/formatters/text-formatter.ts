import { DateUtils } from "../utils/date-utils";

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
  console.log(`\n📊 Work Summary: ${summary.period.label}\n`);
  console.log(
    `Period: ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}`
  );
  console.log(`Repositories: ${summary.repositories.length}\n`);

  // Overall stats with more context
  console.log("📈 Overall Statistics:");
  console.log(`  Commits: ${summary.stats.totalCommits.toLocaleString()}`);
  console.log(
    `  Files Changed: ${summary.stats.totalFilesChanged.toLocaleString()}`
  );
  console.log(
    `  Lines Added: +${summary.stats.totalInsertions.toLocaleString()}`
  );
  console.log(
    `  Lines Deleted: -${summary.stats.totalDeletions.toLocaleString()}`
  );
  const netChange =
    summary.stats.totalInsertions - summary.stats.totalDeletions;
  console.log(
    `  Net Change: ${netChange > 0 ? "+" : ""}${netChange.toLocaleString()} lines`
  );
  console.log(`  Active Days: ${summary.stats.activeDays}`);
  console.log(`  Average Commits/Day: ${summary.stats.averageCommitsPerDay}`);

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
  console.log(`  Lines Changed/Commit: ${linesPerCommit.toLocaleString()}`);
  console.log(`  Commits/Active Day: ${commitFrequency}\n`);

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

    console.log("⏰ Time Patterns:");
    console.log(
      `  Working Hours (9-18): ${workingHoursCommits} commits (${workingHoursPercent}%)`
    );
    console.log(
      `  Weekend Commits: ${weekendCommits} commits (${weekendPercent}%)`
    );
    console.log(
      `  After Hours: ${summary.commits.length - workingHoursCommits} commits (${100 - workingHoursPercent}%)\n`
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

    console.log("📏 Commit Sizes:");
    console.log(`  Median lines changed: ${median}`);
    console.log(
      `  Small commits (≤50 lines): ${smallCommits} (${Math.round((smallCommits / summary.commits.length) * 100)}%)`
    );
    console.log(
      `  Medium commits (51-200 lines): ${mediumCommits} (${Math.round((mediumCommits / summary.commits.length) * 100)}%)`
    );
    console.log(
      `  Large commits (>200 lines): ${largeCommits} (${Math.round((largeCommits / summary.commits.length) * 100)}%)\n`
    );
  }

  // Top languages with percentages
  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    const totalChanges = summary.stats.topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    console.log("💻 Top Languages:");
    for (const lang of summary.stats.topLanguages.slice(0, 8)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      const bar = "█".repeat(Math.max(1, Math.round(percentage / 5)));
      console.log(
        `  ${lang.language.padEnd(12)} ${lang.changes.toLocaleString().padStart(6)} changes (${percentage}%) ${bar}`
      );
    }
    console.log("");
  }

  // Enhanced repository breakdown for verbose mode
  if (verbose && summary.repositories.length > 1) {
    console.log("📁 Repository Breakdown:");
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

      console.log(`  📂 ${repo.name}`);
      console.log(`     ${repo.path}`);
      console.log(
        `     ${repoCommits} commits, ${repoLines.toLocaleString()} lines changed`
      );
      if (repo.remoteUrl) {
        console.log(`     🔗 ${repo.remoteUrl}`);
      }
    }
    console.log("");
  }

  // Top files with more context
  if (verbose && summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    console.log("📄 Most Active Files:");
    for (const file of summary.stats.topFiles.slice(0, 12)) {
      const activity = file.changes === 1 ? "change" : "changes";
      console.log(`  📝 ${file.file} (${file.changes} ${activity})`);
    }
    console.log("");
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

    console.log("🔥 Activity Insights:");
    console.log(`  Longest streak: ${maxStreak} consecutive days`);
    console.log(
      `  Most productive day: ${getMostProductiveDay(summary.commits)}`
    );
    console.log(
      `  Consistency score: ${Math.round((summary.stats.activeDays / DateUtils.getDaysInPeriod(summary.period.startDate, summary.period.endDate)) * 100)}%\n`
    );
  }

  // Weekly activity pattern (simple ASCII chart)
  if (verbose && summary.commits && summary.commits.length > 0) {
    console.log("📅 Weekly Activity Pattern:");
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
      console.log(`  ${dayNames[i]} │${bar}│ ${count} commits`);
    }
    console.log("");
  }

  // Summary and achievements
  console.log("🏆 Summary & Achievements:");
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
    achievements.forEach((achievement) => console.log(`  ${achievement}`));
  } else {
    console.log("  Keep coding to unlock achievements! 💪");
  }
  console.log("");
}
