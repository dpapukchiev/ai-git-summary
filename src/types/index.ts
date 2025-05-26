export interface Repository {
  id?: number;
  name: string;
  path: string;
  remoteUrl?: string;
  lastSynced?: Date;
  weight?: number;
}

export interface Commit {
  id?: number;
  repoId: number;
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  branch?: string;
}

export interface FileChange {
  id?: number;
  commitId: number;
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
}

export interface TimePeriod {
  type: 'week' | 'month' | 'quarter' | 'year' | 'rolling' | 'custom';
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface WorkSummary {
  period: TimePeriod;
  repositories: Repository[];
  stats: {
    totalCommits: number;
    totalFilesChanged: number;
    totalInsertions: number;
    totalDeletions: number;
    activeDays: number;
    averageCommitsPerDay: number;
    topLanguages: { language: string; changes: number }[];
    topFiles: { file: string; changes: number }[];
    otherFilesAnalysis?: {
      commonExtensions?: { extension: string; count: number }[];
      otherFiles?: { filePath: string; changes: number }[];
    };
  };
  commits: Commit[];
  aiSummary?: string;
}

export interface CachedSummary {
  id?: number;
  periodType: string;
  startDate: Date;
  endDate: Date;
  content: string;
  generatedAt: Date;
}

export type PeriodType =
  | '1week'
  | '2weeks'
  | '1month'
  | '3months'
  | '6months'
  | '9months'
  | '1year'
  | 'ytd'
  | 'custom';
