import { ComprehensiveWorkSummary } from '../core/analytics-engine';
import { DateUtils } from '../utils/date-utils';
import { log } from '../utils/logger';

/**
 * Print markdown-formatted summary to console
 * Now uses pre-computed analytics instead of calculating during formatting
 */
export function printMarkdownSummary(summary: ComprehensiveWorkSummary) {
  log.output(
    `# 📊 Work Summary: ${summary.period.label}\n`,
    'markdown-formatter'
  );
  log.output(
    `**Period:** ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}\n`,
    'markdown-formatter'
  );
  log.output(
    `**Repositories:** ${summary.repositories.length}\n`,
    'markdown-formatter'
  );

  // Display AI summary prominently if available
  if (summary.aiSummary) {
    log.output('## 🤖 AI Summary\n', 'markdown-formatter');

    // Split the AI summary into paragraphs and format as markdown
    const paragraphs = summary.aiSummary
      .trim()
      .split(/\n\s*\n/)
      .filter(p => p.trim());

    for (const paragraph of paragraphs) {
      log.output(paragraph.trim() + '\n', 'markdown-formatter');
    }
  }

  log.output('## 📈 Overall Statistics\n', 'markdown-formatter');
  log.output(
    `- **Total Commits:** ${summary.stats.totalCommits.toLocaleString()}`,
    'markdown-formatter'
  );
  log.output(
    `- **Files Changed:** ${summary.stats.totalFilesChanged.toLocaleString()}`,
    'markdown-formatter'
  );
  log.output(
    `- **Lines Added:** +${summary.stats.totalInsertions.toLocaleString()}`,
    'markdown-formatter'
  );
  log.output(
    `- **Lines Deleted:** -${summary.stats.totalDeletions.toLocaleString()}`,
    'markdown-formatter'
  );
  const netChange =
    summary.stats.totalInsertions - summary.stats.totalDeletions;
  log.output(
    `- **Net Change:** ${netChange > 0 ? '+' : ''}${netChange.toLocaleString()} lines`,
    'markdown-formatter'
  );
  log.output(
    `- **Active Days:** ${summary.stats.activeDays}`,
    'markdown-formatter'
  );
  log.output(
    `- **Average Commits/Day:** ${summary.stats.averageCommitsPerDay}`,
    'markdown-formatter'
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
    'markdown-formatter'
  );

  const commitFrequency =
    summary.stats.activeDays > 0
      ? (summary.stats.totalCommits / summary.stats.activeDays).toFixed(1)
      : '0';
  log.output(
    `- **Commits/Active Day:** ${commitFrequency}\n`,
    'markdown-formatter'
  );

  // Use pre-computed analytics
  const { analytics } = summary;

  // Time patterns section
  if (analytics.timePatterns && summary.commits.length > 0) {
    log.output('## ⏰ Time Patterns\n', 'markdown-formatter');

    log.output(
      `- **Working Hours (9AM-6PM):** ${analytics.timePatterns.workingHoursCommits} commits (${analytics.timePatterns.workingHoursPercent}%)`,
      'markdown-formatter'
    );
    log.output(
      `- **Weekend Activity:** ${analytics.timePatterns.weekendCommits} commits (${analytics.timePatterns.weekendPercent}%)`,
      'markdown-formatter'
    );

    if (analytics.timePatterns.peakHour.commits > 0) {
      log.output(
        `- **Peak Hour:** ${analytics.timePatterns.peakHour.label} (${analytics.timePatterns.peakHour.commits} commits)`,
        'markdown-formatter'
      );
    }

    if (analytics.timePatterns.earlyBird.commits > 0) {
      log.output(
        `- **Early Bird:** ${analytics.timePatterns.earlyBird.commits} commits (${analytics.timePatterns.earlyBird.percentage}%) between 6-9AM`,
        'markdown-formatter'
      );
    }

    if (analytics.timePatterns.nightOwl.commits > 0) {
      log.output(
        `- **Night Owl:** ${analytics.timePatterns.nightOwl.commits} commits (${analytics.timePatterns.nightOwl.percentage}%) between 9PM-2AM`,
        'markdown-formatter'
      );
    }

    log.output('', 'markdown-formatter');

    // Time periods table
    if (analytics.timePatterns.timePeriods.length > 0) {
      log.output('### 📋 Activity by Time Period\n', 'markdown-formatter');
      log.output(
        '| Period | Time Range | Commits | Percentage | Type |\n|--------|------------|---------|------------|------|',
        'markdown-formatter'
      );

      for (const period of analytics.timePatterns.timePeriods) {
        if (period.commits > 0) {
          const typeIcon = period.isWorkingTime ? '🏢 Work' : '🏠 Personal';
          const barLength = Math.max(1, Math.round(period.percentage / 2));
          const bar = '▓'.repeat(barLength);

          log.output(
            `| ${period.name} | ${period.timeRange} | ${period.commits} | ${period.percentage}% ${bar} | ${typeIcon} |`,
            'markdown-formatter'
          );
        }
      }
      log.output('', 'markdown-formatter');
    }

    // Hourly heatmap (condensed for markdown)
    const activeHours = analytics.timePatterns.hourlyPattern.filter(
      h => h.commits > 0
    );
    if (activeHours.length > 0) {
      log.output('### ⏰ Hourly Activity Heatmap\n', 'markdown-formatter');
      log.output(
        '| Hour | Commits | Activity |\n|------|---------|----------|',
        'markdown-formatter'
      );

      for (const hour of activeHours.slice(0, 12)) {
        // Show top 12 active hours
        const workingHour = hour.hour >= 9 && hour.hour < 18 ? '🏢' : '🏠';
        log.output(
          `| ${hour.label} | ${hour.commits} | ${hour.bar} ${workingHour} |`,
          'markdown-formatter'
        );
      }
      log.output('', 'markdown-formatter');
    }
  }

  // Commit sizes section
  if (analytics.commitSizeMetrics) {
    log.output('## 📏 Commit Sizes\n', 'markdown-formatter');
    log.output(
      `- **Median lines changed:** ${analytics.commitSizeMetrics.median}`,
      'markdown-formatter'
    );
    log.output(
      `- **Small commits (≤50 lines):** ${analytics.commitSizeMetrics.small} (${analytics.commitSizeMetrics.smallPercentage}%)`,
      'markdown-formatter'
    );
    log.output(
      `- **Medium commits (51-200 lines):** ${analytics.commitSizeMetrics.medium} (${analytics.commitSizeMetrics.mediumPercentage}%)`,
      'markdown-formatter'
    );
    log.output(
      `- **Large commits (>200 lines):** ${analytics.commitSizeMetrics.large} (${analytics.commitSizeMetrics.largePercentage}%)\n`,
      'markdown-formatter'
    );
  }

  // Top languages section
  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    log.output('## 💻 Top Languages\n', 'markdown-formatter');
    log.output(
      '| Language | Changes | Percentage |\n|----------|---------|------------|',
      'markdown-formatter'
    );

    const totalChanges = summary.stats.topLanguages.reduce(
      (sum, lang) => sum + lang.changes,
      0
    );

    for (const lang of summary.stats.topLanguages.slice(0, 8)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      const bar = '█'.repeat(Math.max(1, Math.round(percentage / 5)));
      log.output(
        `| ${lang.language} | ${lang.changes.toLocaleString()} | ${percentage}% ${bar} |`,
        'markdown-formatter'
      );
    }
    log.output('', 'markdown-formatter');
  }

  // Activity insights section
  if (analytics.activityMetrics) {
    log.output('## 🔥 Activity Insights\n', 'markdown-formatter');
    log.output(
      `- **Longest streak:** ${analytics.activityMetrics.longestStreak} consecutive days`,
      'markdown-formatter'
    );
    log.output(
      `- **Most productive day:** ${analytics.activityMetrics.mostProductiveDay}`,
      'markdown-formatter'
    );
    log.output(
      `- **Consistency score:** ${analytics.activityMetrics.consistencyScore}%\n`,
      'markdown-formatter'
    );
  }

  // Weekly pattern section
  if (analytics.weeklyPattern && analytics.weeklyPattern.length > 0) {
    log.output('## 📅 Weekly Activity Pattern\n', 'markdown-formatter');
    log.output(
      '| Day | Commits | Activity |\n|-----|---------|----------|',
      'markdown-formatter'
    );

    for (const day of analytics.weeklyPattern) {
      log.output(
        `| ${day.dayName} | ${day.commits} | ${day.bar} |`,
        'markdown-formatter'
      );
    }
    log.output('', 'markdown-formatter');
  }

  // Achievements section
  if (analytics.achievements && analytics.achievements.length > 0) {
    log.output('## 🏆 Achievements\n', 'markdown-formatter');
    for (const achievement of analytics.achievements) {
      log.output(`- ${achievement}`, 'markdown-formatter');
    }
    log.output('', 'markdown-formatter');
  }

  // Repository breakdown section
  if (
    analytics.repositoryBreakdown &&
    analytics.repositoryBreakdown.length > 1
  ) {
    log.output('## 📁 Repository Breakdown\n', 'markdown-formatter');
    log.output(
      '| Repository | Commits | Lines Changed | Remote |\n|------------|---------|---------------|--------|',
      'markdown-formatter'
    );

    for (const repo of analytics.repositoryBreakdown) {
      const remote = repo.remoteUrl ? `[🔗](${repo.remoteUrl})` : 'N/A';
      log.output(
        `| ${repo.name} | ${repo.commits} | ${repo.linesChanged.toLocaleString()} | ${remote} |`,
        'markdown-formatter'
      );
    }
    log.output('', 'markdown-formatter');
  }
}
