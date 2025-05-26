import fs from 'fs';
import { RepositoryDiscovery } from '../../src/core/repository-discovery';
import { Repository } from '../../src/types';

// Mock fs and path modules
jest.mock('fs');
jest.mock('../../src/utils/logger', () => ({
  log: {
    output: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// Test data constants
const MOCK_DIRENTS = {
  GIT_DIR: {
    name: '.git',
    isDirectory: () => true,
    isFile: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: '.git',
  } as fs.Dirent,
  REGULAR_DIR: {
    name: 'src',
    isDirectory: () => true,
    isFile: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: 'src',
  } as fs.Dirent,
  FILE: {
    name: 'README.md',
    isDirectory: () => false,
    isFile: () => true,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: 'README.md',
  } as fs.Dirent,
  NODE_MODULES: {
    name: 'node_modules',
    isDirectory: () => true,
    isFile: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    parentPath: '',
    path: 'node_modules',
  } as fs.Dirent,
};

// Helper functions
const createMockDirent = (name: string, isDirectory = true): fs.Dirent => ({
  name,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  parentPath: '',
  path: name,
});

const setupMockFileSystem = (structure: Record<string, fs.Dirent[]>): void => {
  mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
    return Object.keys(structure).includes(path.toString());
  });

  mockFs.readdirSync.mockImplementation((path: fs.PathLike) => {
    const dirents = structure[path.toString()];
    if (!dirents) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    return dirents as any;
  });
};

const expectRepository = (
  repo: Repository,
  expectedName: string,
  expectedPath: string
): void => {
  expect(repo).toEqual({
    name: expectedName,
    path: expectedPath,
  });
};

describe('RepositoryDiscovery', () => {
  let discovery: RepositoryDiscovery;

  beforeEach(() => {
    jest.clearAllMocks();
    discovery = new RepositoryDiscovery();
  });

  describe('discoverRepositories', () => {
    it('should discover repositories in multiple search paths', async () => {
      const structure = {
        '/path1': [MOCK_DIRENTS.GIT_DIR, MOCK_DIRENTS.REGULAR_DIR],
        '/path2': [MOCK_DIRENTS.GIT_DIR, MOCK_DIRENTS.FILE],
      };
      setupMockFileSystem(structure);

      const result = await discovery.discoverRepositories(['/path1', '/path2']);

      expect(result).toHaveLength(2);
      expectRepository(result[0]!, 'path1', '/path1');
      expectRepository(result[1]!, 'path2', '/path2');
    });

    it('should skip non-existent search paths', async () => {
      const structure = {
        '/existing': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.discoverRepositories([
        '/existing',
        '/non-existent',
      ]);

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'existing', '/existing');
    });

    it('should handle empty search paths array', async () => {
      const result = await discovery.discoverRepositories([]);

      expect(result).toHaveLength(0);
    });

    it('should handle search paths with no repositories', async () => {
      const structure = {
        '/no-repos': [MOCK_DIRENTS.REGULAR_DIR, MOCK_DIRENTS.FILE],
      };
      setupMockFileSystem(structure);

      const result = await discovery.discoverRepositories(['/no-repos']);

      expect(result).toHaveLength(0);
    });
  });

  describe('findGitRepositories', () => {
    it('should find git repository in root directory', async () => {
      const structure = {
        '/repo': [MOCK_DIRENTS.GIT_DIR, MOCK_DIRENTS.REGULAR_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/repo');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'repo', '/repo');
    });

    it('should find nested git repositories within max depth', async () => {
      const structure = {
        '/root': [createMockDirent('level1')],
        '/root/level1': [createMockDirent('level2')],
        '/root/level1/level2': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root', 3);

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'level2', '/root/level1/level2');
    });

    it('should respect max depth limit', async () => {
      const structure = {
        '/root': [createMockDirent('level1')],
        '/root/level1': [createMockDirent('level2')],
        '/root/level1/level2': [createMockDirent('level3')],
        '/root/level1/level2/level3': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root', 2);

      expect(result).toHaveLength(0);
    });

    it('should use default max depth when not specified', async () => {
      const structure = {
        '/root': [createMockDirent('l1')],
        '/root/l1': [createMockDirent('l2')],
        '/root/l1/l2': [createMockDirent('l3')],
        '/root/l1/l2/l3': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root');

      expect(result).toHaveLength(1);
    });

    it('should not search subdirectories of git repositories', async () => {
      const structure = {
        '/repo': [MOCK_DIRENTS.GIT_DIR, createMockDirent('subdir')],
        '/repo/subdir': [MOCK_DIRENTS.GIT_DIR], // This should not be found
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/repo');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'repo', '/repo');
    });
  });

  describe('directory filtering', () => {
    it('should exclude common build and cache directories', async () => {
      const excludedDirs = [
        'node_modules',
        'dist',
        'build',
        'out',
        'coverage',
        '.next',
        '.cache',
      ];

      for (const dirName of excludedDirs) {
        const structure = {
          '/root': [createMockDirent(dirName)],
          [`/root/${dirName}`]: [MOCK_DIRENTS.GIT_DIR],
        };
        setupMockFileSystem(structure);

        const result = await discovery.findGitRepositories('/root');

        expect(result).toHaveLength(0);
      }
    });

    it('should exclude hidden directories (starting with dot)', async () => {
      const structure = {
        '/root': [createMockDirent('.hidden'), createMockDirent('.secret')],
        '/root/.hidden': [MOCK_DIRENTS.GIT_DIR],
        '/root/.secret': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root');

      expect(result).toHaveLength(0);
    });

    it('should include regular directories', async () => {
      const structure = {
        '/root': [createMockDirent('projects')],
        '/root/projects': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'projects', '/root/projects');
    });

    it('should skip files when scanning directories', async () => {
      const structure = {
        '/root': [
          MOCK_DIRENTS.FILE,
          createMockDirent('README.md', false),
          createMockDirent('package.json', false),
          createMockDirent('validdir'),
        ],
        '/root/validdir': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/root');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'validdir', '/root/validdir');
    });
  });

  describe('git repository detection', () => {
    it('should detect directory with .git folder as repository', async () => {
      const structure = {
        '/repo': [MOCK_DIRENTS.GIT_DIR, MOCK_DIRENTS.REGULAR_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/repo');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'repo', '/repo');
    });

    it('should not detect directory without .git folder as repository', async () => {
      const structure = {
        '/not-repo': [MOCK_DIRENTS.REGULAR_DIR, MOCK_DIRENTS.FILE],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/not-repo');

      expect(result).toHaveLength(0);
    });

    it('should require .git to be a directory, not a file', async () => {
      const gitFile = createMockDirent('.git', false);
      const structure = {
        '/repo': [gitFile, MOCK_DIRENTS.REGULAR_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/repo');

      expect(result).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle permission errors when reading directories', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = await discovery.findGitRepositories('/restricted');

      expect(result).toHaveLength(0);
    });

    it('should handle non-existent directories gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await discovery.discoverRepositories(['/non-existent']);

      expect(result).toHaveLength(0);
    });

    it('should continue processing other directories after encountering errors', async () => {
      const structure: Record<string, fs.Dirent[]> = {
        '/root': [createMockDirent('error-dir'), createMockDirent('good-dir')],
        '/root/good-dir': [MOCK_DIRENTS.GIT_DIR],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        if (pathStr === '/root/error-dir') {
          throw new Error('Permission denied');
        }
        return (structure[pathStr] || []) as any;
      });

      const result = await discovery.findGitRepositories('/root');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'good-dir', '/root/good-dir');
    });
  });

  describe('repository creation', () => {
    it('should create repository with correct name and path', async () => {
      const structure = {
        '/projects/my-awesome-project': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories(
        '/projects/my-awesome-project'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'my-awesome-project',
        path: '/projects/my-awesome-project',
      });
    });

    it('should handle repository names with special characters', async () => {
      const repoPath = '/projects/repo-with_special.chars';
      const structure = {
        [repoPath]: [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories(repoPath);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('repo-with_special.chars');
    });
  });

  describe('complex directory structures', () => {
    it('should handle multiple repositories at different levels', async () => {
      const structure = {
        '/workspace': [
          createMockDirent('project1'),
          createMockDirent('project2'),
          createMockDirent('nested'),
        ],
        '/workspace/project1': [MOCK_DIRENTS.GIT_DIR],
        '/workspace/project2': [MOCK_DIRENTS.GIT_DIR],
        '/workspace/nested': [createMockDirent('deep-project')],
        '/workspace/nested/deep-project': [MOCK_DIRENTS.GIT_DIR],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/workspace');

      expect(result).toHaveLength(3);
      expect(result.map(r => r.name).sort()).toEqual([
        'deep-project',
        'project1',
        'project2',
      ]);
    });

    it('should handle empty directories', async () => {
      const structure = {
        '/empty-workspace': [],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/empty-workspace');

      expect(result).toHaveLength(0);
    });

    it('should handle mixed content directories', async () => {
      const structure = {
        '/mixed': [
          MOCK_DIRENTS.FILE,
          createMockDirent('package.json', false),
          createMockDirent('src'),
          createMockDirent('tests'),
          MOCK_DIRENTS.NODE_MODULES,
          MOCK_DIRENTS.GIT_DIR,
        ],
      };
      setupMockFileSystem(structure);

      const result = await discovery.findGitRepositories('/mixed');

      expect(result).toHaveLength(1);
      expectRepository(result[0]!, 'mixed', '/mixed');
    });
  });
});
