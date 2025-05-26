import { AnalyticsEngine } from '../../src/core/analytics-engine';
import { TestFixtures } from '../helpers/test-fixtures';

describe('AnalyticsEngine', () => {
  describe('computeAnalytics', () => {
    it('should compute comprehensive analytics from work summary', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const result = AnalyticsEngine.computeAnalytics(workSummary);

      // Should return enhanced work summary with analytics
      expect(result).toEqual({
        ...workSummary,
        analytics: expect.objectContaining({
          timePatterns: expect.any(Object),
          commitSizeMetrics: expect.any(Object),
          activityMetrics: expect.any(Object),
          weeklyPattern: expect.any(Array),
          achievements: expect.any(Array),
          repositoryBreakdown: expect.any(Array),
        }),
      });
    });

    it('should handle empty work summary', () => {
      const workSummary = TestFixtures.createEmptyWorkSummary();
      const result = AnalyticsEngine.computeAnalytics(workSummary);

      expect(result.analytics).toBeDefined();
      expect(result.analytics.timePatterns.totalCommits).toBe(0);
      expect(result.analytics.commitSizeMetrics.median).toBe(0);
      expect(result.analytics.weeklyPattern).toHaveLength(0);
      expect(result.analytics.repositoryBreakdown).toHaveLength(0);
    });

    it('should preserve original work summary data', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const result = AnalyticsEngine.computeAnalytics(workSummary);

      // Original data should be preserved
      expect(result.period).toEqual(workSummary.period);
      expect(result.repositories).toEqual(workSummary.repositories);
      expect(result.commits).toEqual(workSummary.commits);
      expect(result.stats).toEqual(workSummary.stats);
    });
  });

  describe('calculateRepositoryBreakdown', () => {
    it('should calculate repository contributions correctly', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const result = AnalyticsEngine.computeAnalytics(workSummary);

      expect(result.analytics.repositoryBreakdown).toBeDefined();
      expect(Array.isArray(result.analytics.repositoryBreakdown)).toBe(true);

      // Should have repository breakdown for repos with commits
      const breakdown = result.analytics.repositoryBreakdown;
      breakdown.forEach(repo => {
        expect(repo).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            path: expect.any(String),
            commits: expect.any(Number),
            linesChanged: expect.any(Number),
            insertions: expect.any(Number),
            deletions: expect.any(Number),
          })
        );

        // Should only include repos with contributions
        expect(repo.commits > 0 || repo.linesChanged > 0).toBe(true);
      });
    });

    it('should sort repositories by contributions', () => {
      // Create work summary with specific commit distribution
      const repositories = TestFixtures.createRepositories();
      const commits = [
        // 3 commits for repo 1
        TestFixtures.createCommit({
          id: 1,
          repoId: 1,
          insertions: 100,
          deletions: 20,
        }),
        TestFixtures.createCommit({
          id: 2,
          repoId: 1,
          insertions: 50,
          deletions: 10,
        }),
        TestFixtures.createCommit({
          id: 3,
          repoId: 1,
          insertions: 30,
          deletions: 5,
        }),
        // 1 commit for repo 2 (but larger)
        TestFixtures.createCommit({
          id: 4,
          repoId: 2,
          insertions: 500,
          deletions: 100,
        }),
        // 2 commits for repo 3
        TestFixtures.createCommit({
          id: 5,
          repoId: 3,
          insertions: 80,
          deletions: 15,
        }),
        TestFixtures.createCommit({
          id: 6,
          repoId: 3,
          insertions: 70,
          deletions: 10,
        }),
      ];

      const workSummary = TestFixtures.createWorkSummary({
        repositories,
        commits,
      });

      const result = AnalyticsEngine.computeAnalytics(workSummary);
      const breakdown = result.analytics.repositoryBreakdown;

      // Should be sorted by commits first, then by lines changed
      expect(breakdown.length).toBeGreaterThanOrEqual(2);
      if (breakdown.length >= 2) {
        expect(breakdown[0]!.commits).toBeGreaterThanOrEqual(
          breakdown[1]!.commits
        );
        if (breakdown[0]!.commits === breakdown[1]!.commits) {
          expect(breakdown[0]!.linesChanged).toBeGreaterThanOrEqual(
            breakdown[1]!.linesChanged
          );
        }
      }
    });

    it('should exclude repositories with no contributions', () => {
      const repositories = TestFixtures.createRepositories();
      const commits = [
        // Only commits for repo 1
        TestFixtures.createCommit({
          id: 1,
          repoId: 1,
          insertions: 100,
          deletions: 20,
        }),
      ];

      const workSummary = TestFixtures.createWorkSummary({
        repositories,
        commits,
      });

      const result = AnalyticsEngine.computeAnalytics(workSummary);
      const breakdown = result.analytics.repositoryBreakdown;

      // Should only include repo 1
      expect(breakdown).toHaveLength(1);
      expect(breakdown[0]!.name).toBe('frontend-app');
    });

    it('should calculate lines changed correctly', () => {
      const repositories = TestFixtures.createRepositories();
      const commits = [
        TestFixtures.createCommit({
          id: 1,
          repoId: 1,
          insertions: 100,
          deletions: 20,
        }),
        TestFixtures.createCommit({
          id: 2,
          repoId: 1,
          insertions: 50,
          deletions: 30,
        }),
      ];

      const workSummary = TestFixtures.createWorkSummary({
        repositories,
        commits,
      });

      const result = AnalyticsEngine.computeAnalytics(workSummary);
      const breakdown = result.analytics.repositoryBreakdown;

      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]!.insertions).toBe(150); // 100 + 50
      expect(breakdown[0]!.deletions).toBe(50); // 20 + 30
      expect(breakdown[0]!.linesChanged).toBe(200); // 150 + 50
    });
  });

  describe('extractTimePatterns', () => {
    it('should extract time patterns correctly', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const timePatterns = AnalyticsEngine.extractTimePatterns(workSummary);

      expect(timePatterns).toEqual(
        expect.objectContaining({
          workingHoursCommits: expect.any(Number),
          weekendCommits: expect.any(Number),
          workingHoursPercent: expect.any(Number),
          weekendPercent: expect.any(Number),
          hourlyPattern: expect.any(Array),
          timePeriods: expect.any(Array),
          peakHour: expect.any(Object),
          earlyBird: expect.any(Object),
          nightOwl: expect.any(Object),
          totalCommits: expect.any(Number),
        })
      );
    });

    it('should handle empty commits', () => {
      const workSummary = TestFixtures.createEmptyWorkSummary();
      const timePatterns = AnalyticsEngine.extractTimePatterns(workSummary);

      expect(timePatterns.totalCommits).toBe(0);
      expect(timePatterns.workingHoursCommits).toBe(0);
      expect(timePatterns.weekendCommits).toBe(0);
    });
  });

  describe('extractCommitSizeMetrics', () => {
    it('should extract commit size metrics correctly', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const commitSizeMetrics =
        AnalyticsEngine.extractCommitSizeMetrics(workSummary);

      expect(commitSizeMetrics).toEqual(
        expect.objectContaining({
          median: expect.any(Number),
          small: expect.any(Number),
          medium: expect.any(Number),
          large: expect.any(Number),
          smallPercentage: expect.any(Number),
          mediumPercentage: expect.any(Number),
          largePercentage: expect.any(Number),
        })
      );
    });

    it('should handle empty commits', () => {
      const workSummary = TestFixtures.createEmptyWorkSummary();
      const commitSizeMetrics =
        AnalyticsEngine.extractCommitSizeMetrics(workSummary);

      expect(commitSizeMetrics.median).toBe(0);
      expect(commitSizeMetrics.small).toBe(0);
      expect(commitSizeMetrics.medium).toBe(0);
      expect(commitSizeMetrics.large).toBe(0);
    });
  });

  describe('extractActivityMetrics', () => {
    it('should extract activity metrics correctly', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const activityMetrics =
        AnalyticsEngine.extractActivityMetrics(workSummary);

      expect(activityMetrics).toEqual(
        expect.objectContaining({
          longestStreak: expect.any(Number),
          mostProductiveDay: expect.any(String),
          consistencyScore: expect.any(Number),
        })
      );
    });

    it('should handle empty commits', () => {
      const workSummary = TestFixtures.createEmptyWorkSummary();
      const activityMetrics =
        AnalyticsEngine.extractActivityMetrics(workSummary);

      expect(activityMetrics.longestStreak).toBe(0);
      expect(activityMetrics.mostProductiveDay).toBe('N/A');
      expect(activityMetrics.consistencyScore).toBe(0);
    });
  });

  describe('extractWeeklyPattern', () => {
    it('should extract weekly pattern correctly', () => {
      const workSummary = TestFixtures.createWorkSummary();
      const weeklyPattern = AnalyticsEngine.extractWeeklyPattern(workSummary);

      expect(weeklyPattern).toHaveLength(7);
      weeklyPattern.forEach(day => {
        expect(day).toEqual(
          expect.objectContaining({
            dayName: expect.any(String),
            commits: expect.any(Number),
            percentage: expect.any(Number),
            bar: expect.any(String),
          })
        );
      });
    });

    it('should handle empty commits', () => {
      const workSummary = TestFixtures.createEmptyWorkSummary();
      const weeklyPattern = AnalyticsEngine.extractWeeklyPattern(workSummary);

      expect(weeklyPattern).toHaveLength(0);
    });
  });

  describe('integration', () => {
    it('should produce consistent results across multiple calls', () => {
      const workSummary = TestFixtures.createWorkSummary();

      const result1 = AnalyticsEngine.computeAnalytics(workSummary);
      const result2 = AnalyticsEngine.computeAnalytics(workSummary);

      // Results should be identical
      expect(result1.analytics).toEqual(result2.analytics);
    });

    it('should handle real-world data patterns', () => {
      // Create a more realistic work summary
      const commits = TestFixtures.createCommitSet();
      const repositories = TestFixtures.createRepositories();
      const workSummary = TestFixtures.createWorkSummary({
        commits,
        repositories,
      });

      const result = AnalyticsEngine.computeAnalytics(workSummary);

      // Verify all analytics are computed
      expect(result.analytics.timePatterns.totalCommits).toBe(commits.length);
      expect(result.analytics.repositoryBreakdown.length).toBeGreaterThan(0);
      expect(result.analytics.weeklyPattern).toHaveLength(7);
      expect(result.analytics.achievements).toBeDefined();

      // Verify data consistency
      const totalCommitsFromBreakdown =
        result.analytics.repositoryBreakdown.reduce(
          (sum, repo) => sum + repo.commits,
          0
        );
      expect(totalCommitsFromBreakdown).toBe(commits.length);
    });
  });
});
