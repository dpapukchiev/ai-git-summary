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
 * Print markdown-formatted summary to console
 */
export function printMarkdownSummary(summary: any) {
  log.output(
    `# 📊 Work Summary: ${summary.period.label}\n`,
    "markdown-formatter"
  );
  log.output(
    `**Period:** ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}\n`,
    "markdown-formatter"
  );
  log.output(
    `**Repositories:** ${summary.repositories.length}\n`,
    "markdown-formatter"
  );

  log.output("## 📈 Overall Statistics\n", "markdown-formatter");
  log.output(
    `- **Total Commits:** ${summary.stats.totalCommits.toLocaleString()}`,
    "markdown-formatter"
  );
  log.output(
    `- **Files Changed:** ${summary.stats.totalFilesChanged.toLocaleString()}`,
    "markdown-formatter"
  );
  log.output(
    `- **Lines Added:** +${summary.stats.totalInsertions.toLocaleString()}`,
    "markdown-formatter"
  );
  log.output(
    `- **Lines Deleted:** -${summary.stats.totalDeletions.toLocaleString()}`,
    "markdown-formatter"
  );
  const netChange =
    summary.stats.totalInsertions - summary.stats.totalDeletions;
  log.output(
    `- **Net Change:** ${netChange > 0 ? "+" : ""}${netChange.toLocaleString()} lines`,
    "markdown-formatter"
  );
  log.output(
    `- **Active Days:** ${summary.stats.activeDays}`,
    "markdown-formatter"
  );
  log.output(
    `- **Average Commits/Day:** ${summary.stats.averageCommitsPerDay}`,
    "markdown-formatter"
  );

  const linesPerCommit =
    summary.stats.totalCommits > 0
      ? Math.round(
          (summary.stats.totalInsertions + summary.stats.totalDeletions) /
            summary.stats.totalCommits
        )
      : 0;
  log.output(
    `- **Lines Changed/Commit:** ${linesPerCommit.toLocaleString()}`,
    "markdown-formatter"
  );
  log.output(
    `- **Commits/Active Day:** ${summary.stats.activeDays > 0 ? (summary.stats.totalCommits / summary.stats.activeDays).toFixed(1) : "0"}\n`,
    "markdown-formatter"
  );

  // Time patterns
  if (summary.commits && summary.commits.length > 0) {
    const workingHoursCommits = summary.commits.filter((c: any) =>
      DateUtils.isWorkingHours(c.date)
    ).length;
    const weekendCommits = summary.commits.filter((c: any) =>
      DateUtils.isWeekend(c.date)
    ).length;
    const workingHoursPercent = Math.round(
      (workingHoursCommits / summary.commits.length) * 100
    );
    const weekendPercent = Math.round(
      (weekendCommits / summary.commits.length) * 100
    );

    log.output("## ⏰ Time Patterns\n", "markdown-formatter");
    log.output(
      `- **Working Hours (9-18):** ${workingHoursCommits} commits (${workingHoursPercent}%)`,
      "markdown-formatter"
    );
    log.output(
      `- **Weekend Commits:** ${weekendCommits} commits (${weekendPercent}%)`,
      "markdown-formatter"
    );
    log.output(
      `- **After Hours:** ${summary.commits.length - workingHoursCommits} commits (${100 - workingHoursPercent}%)\n`,
      "markdown-formatter"
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

    log.output("## 📏 Commit Size Distribution\n", "markdown-formatter");
    log.output(`- **Median Lines Changed:** ${median}`, "markdown-formatter");
    log.output(
      `- **Small Commits (≤50 lines):** ${smallCommits} (${Math.round((smallCommits / summary.commits.length) * 100)}%)`,
      "markdown-formatter"
    );
    log.output(
      `- **Medium Commits (51-200 lines):** ${mediumCommits} (${Math.round((mediumCommits / summary.commits.length) * 100)}%)`,
      "markdown-formatter"
    );
    log.output(
      `- **Large Commits (>200 lines):** ${largeCommits} (${Math.round((largeCommits / summary.commits.length) * 100)}%)\n`,
      "markdown-formatter"
    );
  }

  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    const totalChanges = summary.stats.topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    log.output("## 💻 Programming Languages\n", "markdown-formatter");
    log.output(
      "| Language | Changes | Percentage |\n|----------|---------|------------|",
      "markdown-formatter"
    );
    for (const lang of summary.stats.topLanguages.slice(0, 10)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      log.output(
        `| ${lang.language} | ${lang.changes.toLocaleString()} | ${percentage}% |`,
        "markdown-formatter"
      );
    }
    log.output("", "markdown-formatter");
  }

  // Activity insights
  if (summary.commits && summary.commits.length > 0) {
    log.output("## 🔥 Activity Insights\n", "markdown-formatter");
    log.output(
      `- **Most Productive Day:** ${getMostProductiveDay(summary.commits)}`,
      "markdown-formatter"
    );
    const consistencyScore = Math.round(
      (summary.stats.activeDays /
        DateUtils.getDaysInPeriod(
          summary.period.startDate,
          summary.period.endDate
        )) *
        100
    );
    log.output(
      `- **Consistency Score:** ${consistencyScore}% (active days vs. total period)`,
      "markdown-formatter"
    );
    log.output("", "markdown-formatter");
  }

  // Repository breakdown
  if (summary.repositories.length > 1) {
    log.output("## 📁 Repository Activity\n", "markdown-formatter");
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

      log.output(`### 📂 ${repo.name}\n`, "markdown-formatter");
      log.output(`- **Path:** \`${repo.path}\``, "markdown-formatter");
      log.output(`- **Commits:** ${repoCommits}`, "markdown-formatter");
      log.output(
        `- **Lines Changed:** ${repoLines.toLocaleString()}`,
        "markdown-formatter"
      );
      if (repo.remoteUrl) {
        log.output(`- **Remote:** ${repo.remoteUrl}`, "markdown-formatter");
      }
      log.output("", "markdown-formatter");
    }
  }

  if (summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    log.output("## 📄 Most Active Files\n", "markdown-formatter");
    log.output("| File | Changes |\n|------|--------|", "markdown-formatter");
    for (const file of summary.stats.topFiles.slice(0, 15)) {
      log.output(
        `| \`${file.file}\` | ${file.changes} |`,
        "markdown-formatter"
      );
    }
    log.output("", "markdown-formatter");
  }

  // Achievements
  log.output("## 🏆 Achievements\n", "markdown-formatter");
  const achievements = [];

  if (summary.stats.totalCommits >= 100)
    achievements.push("💯 **Century Club** - 100+ commits!");
  if (summary.stats.totalCommits >= 50)
    achievements.push("⭐ **Consistent Contributor** - 50+ commits!");
  if (summary.stats.activeDays >= 20)
    achievements.push("📅 **Regular Committer** - 20+ active days!");
  if (summary.stats.totalInsertions >= 10000)
    achievements.push("📝 **Code Creator** - 10K+ lines added!");
  if (
    summary.stats.activeDays > 0 &&
    summary.stats.totalCommits / summary.stats.activeDays >= 5
  ) {
    achievements.push("🚀 **Power User** - 5+ commits per active day!");
  }
  if (summary.repositories.length >= 5)
    achievements.push("🔀 **Multi-tasker** - Working on 5+ repositories!");

  if (achievements.length > 0) {
    achievements.forEach((achievement) =>
      log.output(`- ${achievement}`, "markdown-formatter")
    );
  } else {
    log.output(
      "- Keep coding to unlock achievements! 💪",
      "markdown-formatter"
    );
  }
  log.output("", "markdown-formatter");
}
