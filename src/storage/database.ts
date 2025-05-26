import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CachedSummary, Commit, FileChange, Repository } from '../types';

// Database row interfaces
interface RepositoryRow {
  id: number;
  name: string;
  path: string;
  remote_url?: string;
  last_synced?: string;
  weight?: number;
}

interface CommitRow {
  id: number;
  repo_id: number;
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  branch?: string;
}

interface FileChangeRow {
  id: number;
  commit_id: number;
  file_path: string;
  change_type: string;
  insertions: number;
  deletions: number;
}

interface CachedSummaryRow {
  id: number;
  period_type: string;
  start_date: string;
  end_date: string;
  content: string;
  generated_at: string;
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dataDir: string = './data') {
    // Handle in-memory databases
    if (dataDir.startsWith(':memory:')) {
      this.dbPath = dataDir;
      this.db = new Database(this.dbPath);
    } else {
      // Ensure data directory exists for file-based databases
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.dbPath = path.join(dataDir, 'git-summary.db');
      this.db = new Database(this.dbPath);
    }

    this.setupSchema();
  }

  private setupSchema(): void {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT UNIQUE NOT NULL,
        remote_url TEXT,
        last_synced DATETIME,
        weight REAL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id INTEGER NOT NULL,
        hash TEXT NOT NULL,
        author TEXT NOT NULL,
        email TEXT NOT NULL,
        date DATETIME NOT NULL,
        message TEXT NOT NULL,
        files_changed INTEGER NOT NULL,
        insertions INTEGER NOT NULL,
        deletions INTEGER NOT NULL,
        branch TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repo_id) REFERENCES repositories (id) ON DELETE CASCADE,
        UNIQUE(repo_id, hash)
      );

      CREATE TABLE IF NOT EXISTS file_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('added', 'modified', 'deleted', 'renamed')),
        insertions INTEGER NOT NULL,
        deletions INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (commit_id) REFERENCES commits (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cached_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        content TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits (repo_id, date);
      CREATE INDEX IF NOT EXISTS idx_commits_author ON commits (author);
      CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits (hash);
      CREATE INDEX IF NOT EXISTS idx_file_changes_commit ON file_changes (commit_id);
      CREATE INDEX IF NOT EXISTS idx_cached_summaries_period ON cached_summaries (period_type, start_date, end_date);
    `);
  }

  // Repository operations
  addRepository(repo: Omit<Repository, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (name, path, remote_url, weight)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      repo.name,
      repo.path,
      repo.remoteUrl || null,
      repo.weight || 1.0
    );
    return result.lastInsertRowid as number;
  }

  getRepository(path: string): Repository | null {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE path = ?');
    const row = stmt.get(path) as RepositoryRow;
    return row ? this.mapRepository(row) : null;
  }

  getAllRepositories(): Repository[] {
    const stmt = this.db.prepare('SELECT * FROM repositories ORDER BY name');
    const rows = stmt.all() as RepositoryRow[];
    return rows.map(this.mapRepository);
  }

  updateRepositoryLastSynced(repoId: number, date: Date): void {
    const stmt = this.db.prepare(
      'UPDATE repositories SET last_synced = ? WHERE id = ?'
    );
    stmt.run(date.toISOString(), repoId);
  }

  // Commit operations
  addCommit(commit: Omit<Commit, 'id'>): number {
    // First check if commit already exists
    const existingStmt = this.db.prepare(`
      SELECT id FROM commits WHERE repo_id = ? AND hash = ?
    `);
    const existing = existingStmt.get(commit.repoId, commit.hash) as CommitRow;

    if (existing) {
      return existing.id;
    }

    // Insert new commit
    const stmt = this.db.prepare(`
      INSERT INTO commits 
      (repo_id, hash, author, email, date, message, files_changed, insertions, deletions, branch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      commit.repoId,
      commit.hash,
      commit.author,
      commit.email,
      commit.date.toISOString(),
      commit.message,
      commit.filesChanged,
      commit.insertions,
      commit.deletions,
      commit.branch || null
    );
    return result.lastInsertRowid as number;
  }

  getCommitsByRepository(
    repoId: number,
    startDate?: Date,
    endDate?: Date
  ): Commit[] {
    let query = 'SELECT * FROM commits WHERE repo_id = ?';
    const params: (number | string)[] = [repoId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate.toISOString());
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as CommitRow[];
    return rows.map(this.mapCommit);
  }

  getCommitsByDateRange(
    startDate: Date,
    endDate: Date,
    repoIds?: number[],
    author?: string
  ): Commit[] {
    let query = 'SELECT * FROM commits WHERE date >= ? AND date <= ?';
    const params: (number | string)[] = [
      startDate.toISOString(),
      endDate.toISOString(),
    ];

    if (repoIds && repoIds.length > 0) {
      query += ` AND repo_id IN (${repoIds.map(() => '?').join(',')})`;
      params.push(...repoIds);
    }

    if (author) {
      query += ' AND (author = ? OR email = ?)';
      params.push(author, author);
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as CommitRow[];
    return rows.map(this.mapCommit);
  }

  getLatestCommitDate(repoId: number): Date | null {
    const stmt = this.db.prepare(
      'SELECT MAX(date) as latest_date FROM commits WHERE repo_id = ?'
    );
    const result = stmt.get(repoId) as { latest_date?: string } | undefined;
    return result?.latest_date ? new Date(result.latest_date) : null;
  }

  // File change operations
  addFileChange(fileChange: Omit<FileChange, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO file_changes (commit_id, file_path, change_type, insertions, deletions)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      fileChange.commitId,
      fileChange.filePath,
      fileChange.changeType,
      fileChange.insertions,
      fileChange.deletions
    );
    return result.lastInsertRowid as number;
  }

  getFileChangesByCommit(commitId: number): FileChange[] {
    const stmt = this.db.prepare(
      'SELECT * FROM file_changes WHERE commit_id = ?'
    );
    const rows = stmt.all(commitId) as FileChangeRow[];
    return rows.map(this.mapFileChange);
  }

  getFileChangesByDateRange(
    startDate: Date,
    endDate: Date,
    repoIds?: number[]
  ): FileChange[] {
    let query = `
      SELECT fc.* FROM file_changes fc
      INNER JOIN commits c ON fc.commit_id = c.id
      WHERE c.date >= ? AND c.date <= ?
    `;
    const params: (number | string)[] = [
      startDate.toISOString(),
      endDate.toISOString(),
    ];

    if (repoIds && repoIds.length > 0) {
      query += ` AND c.repo_id IN (${repoIds.map(() => '?').join(',')})`;
      params.push(...repoIds);
    }

    query += ' ORDER BY c.date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as FileChangeRow[];
    return rows.map(this.mapFileChange);
  }

  // Summary cache operations
  getCachedSummary(
    periodType: string,
    startDate: Date,
    endDate: Date
  ): CachedSummary | null {
    const stmt = this.db.prepare(`
      SELECT * FROM cached_summaries 
      WHERE period_type = ? AND start_date = ? AND end_date = ?
      ORDER BY generated_at DESC
      LIMIT 1
    `);
    const row = stmt.get(
      periodType,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ) as CachedSummaryRow;
    return row ? this.mapCachedSummary(row) : null;
  }

  saveCachedSummary(summary: Omit<CachedSummary, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO cached_summaries (period_type, start_date, end_date, content)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      summary.periodType,
      summary.startDate.toISOString().split('T')[0],
      summary.endDate.toISOString().split('T')[0],
      summary.content
    );
    return result.lastInsertRowid as number;
  }

  // Utility methods
  private mapRepository(row: RepositoryRow): Repository {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      remoteUrl: row.remote_url,
      lastSynced: row.last_synced ? new Date(row.last_synced) : undefined,
      weight: row.weight,
    };
  }

  private mapCommit(row: CommitRow): Commit {
    return {
      id: row.id,
      repoId: row.repo_id,
      hash: row.hash,
      author: row.author,
      email: row.email,
      date: new Date(row.date),
      message: row.message,
      filesChanged: row.files_changed,
      insertions: row.insertions,
      deletions: row.deletions,
      branch: row.branch,
    };
  }

  private mapFileChange(row: FileChangeRow): FileChange {
    // Validate change_type to ensure it matches the expected union type
    const validChangeTypes = [
      'added',
      'modified',
      'deleted',
      'renamed',
    ] as const;
    const changeType = validChangeTypes.includes(
      row.change_type as (typeof validChangeTypes)[number]
    )
      ? (row.change_type as 'added' | 'modified' | 'deleted' | 'renamed')
      : 'modified'; // Default fallback

    return {
      id: row.id,
      commitId: row.commit_id,
      filePath: row.file_path,
      changeType,
      insertions: row.insertions,
      deletions: row.deletions,
    };
  }

  private mapCachedSummary(row: CachedSummaryRow): CachedSummary {
    return {
      id: row.id,
      periodType: row.period_type,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      content: row.content,
      generatedAt: new Date(row.generated_at),
    };
  }

  close(): void {
    this.db.close();
  }
}
