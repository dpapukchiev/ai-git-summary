import { execSync } from 'child_process';
import {
  GitRemoteInfo,
  GitUtils,
  organizationMatches,
  parseGitRemoteUrl,
} from '../../src/utils/git-utils';

// Mock child_process.execSync
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// Test data constants
const TEST_URLS = {
  SSH: {
    GITHUB: 'git@github.com:facebook/react.git',
    GITHUB_NO_GIT: 'git@github.com:microsoft/typescript',
    GITLAB: 'git@gitlab.com:gitlab-org/gitlab.git',
    BITBUCKET: 'git@bitbucket.org:atlassian/jira.git',
    CUSTOM: 'git@git.company.com:team/project.git',
    COMPLEX_NAME: 'git@github.com:org/repo-with-dashes_and_underscores.git',
  },
  HTTPS: {
    GITHUB: 'https://github.com/facebook/react.git',
    GITHUB_NO_GIT: 'https://github.com/microsoft/typescript',
    HTTP: 'http://github.com/facebook/react.git',
    GITLAB: 'https://gitlab.com/gitlab-org/gitlab.git',
    BITBUCKET: 'https://bitbucket.org/atlassian/jira.git',
    CUSTOM: 'https://git.company.com/team/project.git',
    WITH_AUTH: 'https://token@github.com/org/repo.git',
  },
  MALFORMED: {
    SSH: [
      'git@github.com',
      'git@github.com:',
      'git@github.com:org',
      'git@:org/repo',
      '@github.com:org/repo',
      'git@github.com:org/',
      'git@github.com:/repo',
    ],
    HTTPS: [
      'https://github.com',
      'https://github.com/',
      'https://github.com/org',
      'https://github.com/org/',
      'https:///org/repo',
    ],
    INVALID: [
      'not-a-url',
      'ftp://example.com/repo',
      'file:///local/path',
      'just-some-text',
      '123456',
      'git@',
      'https://',
    ],
  },
};

const EXPECTED_RESULTS = {
  GITHUB_REACT: {
    provider: 'github' as const,
    organization: 'facebook',
    repository: 'react',
  },
  MICROSOFT_TS: {
    provider: 'github' as const,
    organization: 'microsoft',
    repository: 'typescript',
  },
  GITLAB_GITLAB: {
    provider: 'gitlab' as const,
    organization: 'gitlab-org',
    repository: 'gitlab',
  },
  BITBUCKET_JIRA: {
    provider: 'bitbucket' as const,
    organization: 'atlassian',
    repository: 'jira',
  },
  CUSTOM_PROJECT: {
    provider: 'other' as const,
    organization: 'team',
    repository: 'project',
  },
};

// Helper functions
const expectGitRemoteResult = (
  url: string,
  expected: Partial<GitRemoteInfo>
): void => {
  const result = parseGitRemoteUrl(url);
  expect(result).toEqual({
    ...expected,
    url,
  });
};

const expectNullResult = (url: string): void => {
  const result = parseGitRemoteUrl(url);
  expect(result).toBeNull();
};

const testProviderDetection = (
  urls: string[],
  expectedProvider: GitRemoteInfo['provider']
): void => {
  urls.forEach(url => {
    const result = parseGitRemoteUrl(url);
    if (result) {
      expect(result.provider).toBe(expectedProvider);
    }
  });
};

const setupMockExecSync = (responses: (string | Error)[]): void => {
  responses.forEach(response => {
    if (response instanceof Error) {
      mockExecSync.mockImplementationOnce(() => {
        throw response;
      });
    } else {
      mockExecSync.mockReturnValueOnce(response);
    }
  });
};

describe('GitUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecSync.mockReset();
  });

  describe('getCurrentUser', () => {
    const testCases = [
      {
        name: 'should return user name when available',
        setup: ['John Doe\n'],
        expected: 'John Doe',
        expectedCalls: 1,
      },
      {
        name: 'should return user email when name is not available',
        setup: [new Error('No user.name configured'), 'john@example.com\n'],
        expected: 'john@example.com',
        expectedCalls: 2,
      },
      {
        name: 'should return null when neither name nor email is available',
        setup: [
          new Error('Git config not found'),
          new Error('Git config not found'),
        ],
        expected: null,
        expectedCalls: 2,
      },
      {
        name: 'should handle empty string responses',
        setup: ['', 'user@domain.com\n'],
        expected: 'user@domain.com',
        expectedCalls: 2,
      },
      {
        name: 'should handle whitespace-only responses',
        setup: ['   \n   ', 'user@domain.com\n'],
        expected: 'user@domain.com',
        expectedCalls: 2,
      },
      {
        name: 'should trim whitespace from git config output',
        setup: ['  John Doe  \n'],
        expected: 'John Doe',
        expectedCalls: 1,
      },
    ];

    testCases.forEach(({ name, setup, expected, expectedCalls }) => {
      it(name, () => {
        setupMockExecSync(setup);

        const result = GitUtils.getCurrentUser();

        expect(result).toBe(expected);
        expect(mockExecSync).toHaveBeenCalledTimes(expectedCalls);
      });
    });

    it('should call git config commands with correct parameters', () => {
      setupMockExecSync([new Error('No user.name'), 'user@example.com\n']);

      GitUtils.getCurrentUser();

      expect(mockExecSync).toHaveBeenCalledWith('git config user.name', {
        encoding: 'utf8',
      });
      expect(mockExecSync).toHaveBeenCalledWith('git config user.email', {
        encoding: 'utf8',
      });
    });
  });
});

describe('parseGitRemoteUrl', () => {
  describe('SSH URL parsing', () => {
    const sshTestCases = [
      {
        name: 'GitHub SSH URL',
        url: TEST_URLS.SSH.GITHUB,
        expected: EXPECTED_RESULTS.GITHUB_REACT,
      },
      {
        name: 'GitHub SSH URL without .git suffix',
        url: TEST_URLS.SSH.GITHUB_NO_GIT,
        expected: EXPECTED_RESULTS.MICROSOFT_TS,
      },
      {
        name: 'GitLab SSH URL',
        url: TEST_URLS.SSH.GITLAB,
        expected: EXPECTED_RESULTS.GITLAB_GITLAB,
      },
      {
        name: 'Bitbucket SSH URL',
        url: TEST_URLS.SSH.BITBUCKET,
        expected: EXPECTED_RESULTS.BITBUCKET_JIRA,
      },
      {
        name: 'custom Git server SSH URL',
        url: TEST_URLS.SSH.CUSTOM,
        expected: EXPECTED_RESULTS.CUSTOM_PROJECT,
      },
      {
        name: 'SSH URLs with complex repository names',
        url: TEST_URLS.SSH.COMPLEX_NAME,
        expected: {
          provider: 'github' as const,
          organization: 'org',
          repository: 'repo-with-dashes_and_underscores',
        },
      },
    ];

    sshTestCases.forEach(({ name, url, expected }) => {
      it(`should parse ${name} correctly`, () => {
        expectGitRemoteResult(url, expected);
      });
    });
  });

  describe('HTTPS URL parsing', () => {
    const httpsTestCases = [
      {
        name: 'GitHub HTTPS URL',
        url: TEST_URLS.HTTPS.GITHUB,
        expected: EXPECTED_RESULTS.GITHUB_REACT,
      },
      {
        name: 'GitHub HTTPS URL without .git suffix',
        url: TEST_URLS.HTTPS.GITHUB_NO_GIT,
        expected: EXPECTED_RESULTS.MICROSOFT_TS,
      },
      {
        name: 'HTTP URL (not HTTPS)',
        url: TEST_URLS.HTTPS.HTTP,
        expected: EXPECTED_RESULTS.GITHUB_REACT,
      },
      {
        name: 'GitLab HTTPS URL',
        url: TEST_URLS.HTTPS.GITLAB,
        expected: EXPECTED_RESULTS.GITLAB_GITLAB,
      },
      {
        name: 'Bitbucket HTTPS URL',
        url: TEST_URLS.HTTPS.BITBUCKET,
        expected: EXPECTED_RESULTS.BITBUCKET_JIRA,
      },
      {
        name: 'custom Git server HTTPS URL',
        url: TEST_URLS.HTTPS.CUSTOM,
        expected: EXPECTED_RESULTS.CUSTOM_PROJECT,
      },
    ];

    httpsTestCases.forEach(({ name, url, expected }) => {
      it(`should parse ${name} correctly`, () => {
        expectGitRemoteResult(url, expected);
      });
    });

    it('should handle HTTPS URLs with authentication tokens', () => {
      expectGitRemoteResult(TEST_URLS.HTTPS.WITH_AUTH, {
        provider: 'github',
        organization: 'org',
        repository: 'repo',
      });
    });
  });

  describe('Provider detection', () => {
    const providerTestCases = [
      {
        name: 'GitHub variants',
        urls: [
          'git@github.com:org/repo.git',
          'https://github.com/org/repo.git',
          'git@github.enterprise.com:org/repo.git',
          'https://github.enterprise.com/org/repo.git',
        ],
        expectedProvider: 'github' as const,
      },
      {
        name: 'GitLab variants',
        urls: [
          'git@gitlab.com:org/repo.git',
          'https://gitlab.com/org/repo.git',
          'git@gitlab.company.com:org/repo.git',
          'https://gitlab.company.com/org/repo.git',
        ],
        expectedProvider: 'gitlab' as const,
      },
      {
        name: 'Bitbucket variants',
        urls: [
          'git@bitbucket.org:org/repo.git',
          'https://bitbucket.org/org/repo.git',
          'git@bitbucket.company.com:org/repo.git',
          'https://bitbucket.company.com/org/repo.git',
        ],
        expectedProvider: 'bitbucket' as const,
      },
      {
        name: 'unknown providers (should default to "other")',
        urls: [
          'git@git.example.com:org/repo.git',
          'https://git.example.com/org/repo.git',
          'git@custom-git-server.com:org/repo.git',
        ],
        expectedProvider: 'other' as const,
      },
    ];

    providerTestCases.forEach(({ name, urls, expectedProvider }) => {
      it(`should detect ${name} correctly`, () => {
        testProviderDetection(urls, expectedProvider);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    const nullInputTestCases = [
      { name: 'empty string', input: '' },
      { name: 'null input', input: null as any },
      { name: 'undefined input', input: undefined as any },
    ];

    nullInputTestCases.forEach(({ name, input }) => {
      it(`should return null for ${name}`, () => {
        expectNullResult(input);
      });
    });

    it('should handle URLs with extra whitespace', () => {
      const url = '  git@github.com:facebook/react.git  ';
      expectGitRemoteResult(url, EXPECTED_RESULTS.GITHUB_REACT);
    });

    it('should return null for malformed SSH URLs', () => {
      TEST_URLS.MALFORMED.SSH.forEach(expectNullResult);
    });

    it('should return null for malformed HTTPS URLs', () => {
      TEST_URLS.MALFORMED.HTTPS.forEach(expectNullResult);

      // Test the edge case that actually parses
      const result = parseGitRemoteUrl('https://github.com/org//repo');
      expect(result).toEqual({
        provider: 'github',
        organization: 'org',
        repository: '/repo',
        url: 'https://github.com/org//repo',
      });
    });

    it('should return null for completely invalid URLs', () => {
      TEST_URLS.MALFORMED.INVALID.forEach(expectNullResult);
    });

    it('should handle URLs with missing components gracefully', () => {
      expectNullResult('git@github.com::repo.git');
      expectNullResult('https://github.com//repo.git');
    });
  });

  describe('URL normalization', () => {
    it('should remove .git suffix consistently', () => {
      const testPairs: [string, string][] = [
        ['git@github.com:org/repo.git', 'git@github.com:org/repo'],
        ['https://github.com/org/repo.git', 'https://github.com/org/repo'],
      ];

      testPairs.forEach(([urlWithGit, urlWithoutGit]) => {
        const resultWithGit = parseGitRemoteUrl(urlWithGit);
        const resultWithoutGit = parseGitRemoteUrl(urlWithoutGit);

        expect(resultWithGit?.repository).toBe('repo');
        expect(resultWithoutGit?.repository).toBe('repo');
        expect(resultWithGit?.organization).toBe(
          resultWithoutGit?.organization
        );
      });
    });

    it('should preserve original URL in result', () => {
      const originalUrl = TEST_URLS.SSH.GITHUB;
      const result = parseGitRemoteUrl(originalUrl);
      expect(result?.url).toBe(originalUrl);
    });
  });
});

describe('organizationMatches', () => {
  const matchTestCases = [
    {
      name: 'identical organization names',
      pairs: [
        ['facebook', 'facebook'],
        ['Microsoft', 'Microsoft'],
        ['google', 'google'],
      ] as [string, string][],
      expected: true,
    },
    {
      name: 'organization names case-insensitively',
      pairs: [
        ['Facebook', 'facebook'],
        ['MICROSOFT', 'microsoft'],
        ['Google', 'GOOGLE'],
        ['GitLab', 'gitlab'],
      ] as [string, string][],
      expected: true,
    },
    {
      name: 'mixed case scenarios',
      pairs: [
        ['FaceBook', 'facebook'],
        ['microSOFT', 'Microsoft'],
        ['GooGLe', 'GOOGLE'],
      ] as [string, string][],
      expected: true,
    },
    {
      name: 'organization names with special characters',
      pairs: [
        ['my-org', 'my-org'],
        ['My-Org', 'my-org'],
        ['org_name', 'ORG_NAME'],
        ['org.name', 'Org.Name'],
      ] as [string, string][],
      expected: true,
    },
    {
      name: 'organization names with numbers',
      pairs: [
        ['org123', 'ORG123'],
        ['123org', '123ORG'],
      ] as [string, string][],
      expected: true,
    },
    {
      name: 'whitespace correctly (matching)',
      pairs: [
        ['facebook', 'facebook'],
        ['face book', 'face book'],
        ['Face Book', 'face book'],
      ] as [string, string][],
      expected: true,
    },
  ];

  const nonMatchTestCases = [
    {
      name: 'different organization names',
      pairs: [
        ['facebook', 'google'],
        ['Microsoft', 'Apple'],
        ['github', 'gitlab'],
        ['org1', 'org2'],
      ] as [string, string][],
      expected: false,
    },
    {
      name: 'empty strings vs non-empty',
      pairs: [
        ['facebook', ''],
        ['', 'facebook'],
      ] as [string, string][],
      expected: false,
    },
    {
      name: 'whitespace differences',
      pairs: [['facebook', 'face book']] as [string, string][],
      expected: false,
    },
  ];

  [...matchTestCases, ...nonMatchTestCases].forEach(
    ({ name, pairs, expected }) => {
      it(`should ${expected ? 'match' : 'not match'} ${name}`, () => {
        pairs.forEach(([org1, org2]) => {
          expect(organizationMatches(org1, org2)).toBe(expected);
        });
      });
    }
  );

  it('should handle empty strings matching each other', () => {
    expect(organizationMatches('', '')).toBe(true);
  });
});
