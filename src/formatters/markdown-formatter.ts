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
 * Print markdown-formatted summary to console
 */
export function printMarkdownSummary(summary: any) {
  console.log(`# 📊 Work Summary: ${summary.period.label}\n`);
  console.log(
    `**Period:** ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}\n`
  );
  console.log(`**Repositories:** ${summary.repositories.length}\n`);

  console.log("## 📈 Overall Statistics\n");
  console.log(
    `- **Total Commits:** ${summary.stats.totalCommits.toLocaleString()}`
  );
  console.log(
    `- **Files Changed:** ${summary.stats.totalFilesChanged.toLocaleString()}`
  );
  console.log(
    `- **Lines Added:** +${summary.stats.totalInsertions.toLocaleString()}`
  );
  console.log(
    `- **Lines Deleted:** -${summary.stats.totalDeletions.toLocaleString()}`
  );
  const netChange =
    summary.stats.totalInsertions - summary.stats.totalDeletions;
  console.log(
    `- **Net Change:** ${netChange > 0 ? "+" : ""}${netChange.toLocaleString()} lines`
  );
  console.log(`- **Active Days:** ${summary.stats.activeDays}`);
  console.log(
    `- **Average Commits/Day:** ${summary.stats.averageCommitsPerDay}`
  );

  const linesPerCommit =
    summary.stats.totalCommits > 0
      ? Math.round(
          (summary.stats.totalInsertions + summary.stats.totalDeletions) /
            summary.stats.totalCommits
        )
      : 0;
  console.log(`- **Lines Changed/Commit:** ${linesPerCommit.toLocaleString()}`);
  console.log(
    `- **Commits/Active Day:** ${summary.stats.activeDays > 0 ? (summary.stats.totalCommits / summary.stats.activeDays).toFixed(1) : "0"}\n`
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

    console.log("## ⏰ Time Patterns\n");
    console.log(
      `- **Working Hours (9-18):** ${workingHoursCommits} commits (${workingHoursPercent}%)`
    );
    console.log(
      `- **Weekend Commits:** ${weekendCommits} commits (${weekendPercent}%)`
    );
    console.log(
      `- **After Hours:** ${summary.commits.length - workingHoursCommits} commits (${100 - workingHoursPercent}%)\n`
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

    console.log("## 📏 Commit Size Distribution\n");
    console.log(`- **Median Lines Changed:** ${median}`);
    console.log(
      `- **Small Commits (≤50 lines):** ${smallCommits} (${Math.round((smallCommits / summary.commits.length) * 100)}%)`
    );
    console.log(
      `- **Medium Commits (51-200 lines):** ${mediumCommits} (${Math.round((mediumCommits / summary.commits.length) * 100)}%)`
    );
    console.log(
      `- **Large Commits (>200 lines):** ${largeCommits} (${Math.round((largeCommits / summary.commits.length) * 100)}%)\n`
    );
  }

  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    const totalChanges = summary.stats.topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    console.log("## 💻 Programming Languages\n");
    console.log(
      "| Language | Changes | Percentage |\n|----------|---------|------------|\n"
    );
    for (const lang of summary.stats.topLanguages.slice(0, 10)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      console.log(
        `| ${lang.language} | ${lang.changes.toLocaleString()} | ${percentage}% |`
      );
    }
    console.log("");
  }

  // Activity insights
  if (summary.commits && summary.commits.length > 0) {
    console.log("## 🔥 Activity Insights\n");
    console.log(
      `- **Most Productive Day:** ${getMostProductiveDay(summary.commits)}`
    );
    const consistencyScore = Math.round(
      (summary.stats.activeDays /
        DateUtils.getDaysInPeriod(
          summary.period.startDate,
          summary.period.endDate
        )) *
        100
    );
    console.log(
      `- **Consistency Score:** ${consistencyScore}% (active days vs. total period)`
    );
    console.log("");
  }

  // Repository breakdown
  if (summary.repositories.length > 1) {
    console.log("## 📁 Repository Activity\n");
    for (const repo of summary.repositories) {
      const repoCommits = summary.commits
        ? summary.commits.filter((c: any) => c.repositoryId === repo.id).length
        : 0;
      const repoLines = summary.commits
        ? summary.commits
            .filter((c: any) => c.repositoryId === repo.id)
            .reduce(
              (sum: number, c: any) => sum + c.insertions + c.deletions,
              0
            )
        : 0;

      console.log(`### 📂 ${repo.name}\n`);
      console.log(`- **Path:** \`${repo.path}\``);
      console.log(`- **Commits:** ${repoCommits}`);
      console.log(`- **Lines Changed:** ${repoLines.toLocaleString()}`);
      if (repo.remoteUrl) {
        console.log(`- **Remote:** ${repo.remoteUrl}`);
      }
      console.log("");
    }
  }

  if (summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    console.log("## 📄 Most Active Files\n");
    console.log("| File | Changes |\n|------|--------|\n");
    for (const file of summary.stats.topFiles.slice(0, 15)) {
      console.log(`| \`${file.file}\` | ${file.changes} |`);
    }
    console.log("");
  }

  // Achievements
  console.log("## 🏆 Achievements\n");
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
    achievements.forEach((achievement) => console.log(`- ${achievement}`));
  } else {
    console.log("- Keep coding to unlock achievements! 💪");
  }
  console.log("");
}
