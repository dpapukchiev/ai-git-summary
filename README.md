# AI Git Summary

An intelligent git activity analyzer that provides comprehensive summaries of your coding work
across different time periods. Track your productivity, analyze patterns, and get AI-powered
insights into your development activities.

## Features

- 📊 **Multi-Repository Analysis** - Track multiple git repositories
- 🕐 **Flexible Time Periods** - Last week, month, quarter, year, or custom ranges
- 💾 **Smart Caching** - Incremental data fetching for efficiency
- 📈 **Rich Analytics** - Commits, file changes, language breakdown, and trends
- 🤖 **AI-Ready** - Extensible for future AI-powered summaries
- 🖥️ **CLI Interface** - Easy-to-use command line tools
- 📄 **Multiple Formats** - Text, JSON, and Markdown output
- 👤 **Author Filtering** - Filter commits by specific authors or current user
- 🏢 **Organization Support** - Add all repositories from a specific organization

## How It Works

AI Git Summary is designed around a simple but powerful workflow that transforms your scattered git
repositories into meaningful productivity insights.

### The Big Picture

Think of it as your personal coding activity tracker. Instead of manually checking each repository
to see what you've been working on, the tool automatically collects, processes, and summarizes your
git activity across all your projects.

### Core Workflow

1. **📁 Repository Discovery & Registration**

   - You tell the tool about your repositories (either individually or by scanning directories)
   - The tool registers them in a local SQLite database with metadata like path, name, and remote
     URL

2. **🔄 Data Collection & Sync**

   - The tool reads git history from each repository using `simple-git`
   - Commit data is extracted: author, timestamp, message, file changes, insertions/deletions
   - Data is stored locally and incrementally updated (only new commits since last sync)

3. **📊 Analysis & Aggregation**

   - When you request a summary, the tool queries the database for the specified time period
   - Raw commit data is processed into meaningful statistics: commit frequency, language breakdown,
     productivity trends
   - File extensions are analyzed to determine programming languages used

4. **📋 Summary Generation**
   - Statistics are formatted into human-readable summaries (text, JSON, or Markdown)
   - You can filter by author, repository, or time period to get exactly the insights you need

### Data Flow

```
Git Repositories → Local Database → Analysis Engine → Formatted Output
     ↓                 ↓                ↓              ↓
  [Commits]        [Cached Data]    [Statistics]   [Summary Report]
```

### Key Benefits of This Approach

- **Offline-First**: Once synced, you can generate summaries without internet access
- **Fast**: Incremental updates mean only new data is processed
- **Flexible**: Same data can be viewed in different time periods and formats
- **Privacy**: All data stays on your machine
- **Scalable**: Handles multiple repositories efficiently with concurrent processing

### Typical User Journey

1. **Setup**: Add your repositories once using `add-repo` or `discover`
2. **Daily**: Run `sync` to keep data current (or let it auto-sync during summary generation)
3. **Regular**: Generate summaries (`week`, `month`, etc.) to track your progress
4. **Reporting**: Export summaries in different formats for sharing or record-keeping

This architecture makes it easy to get insights into your coding patterns without disrupting your
normal development workflow.

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Build the Project

```bash
npm run build
# or
yarn build
```

## Quick Start

You have multiple ways to run the CLI:

### Option 1: Use the Bash Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x git-summary.sh

# Run any command
./git-summary.sh add-repo .
./git-summary.sh week --verbose
```

### Option 2: Use npm/yarn scripts

```bash
# Run in development mode
npm run dev add-repo .
npm run dev week

# Or with yarn
yarn dev add-repo .
yarn dev week
```

### Option 3: Use the built CLI directly

```bash
# After running npm run build
node dist/cli/index.js add-repo .
```

### Option 4: Install globally

```bash
npm install -g .
# Then use directly:
git-summary add-repo .
```

## Getting Started

### 1. Add Your First Repository

```bash
# Add current directory
./git-summary.sh add-repo .

# Add specific repository with custom name
./git-summary.sh add-repo /path/to/your/project --name "My Project"
```

### 2. Discover Multiple Repositories

```bash
# Search your work directory for git repositories
./git-summary.sh discover ~/work ~/projects

# Search with custom depth and concurrency
./git-summary.sh discover ~/work --max-depth 2 --concurrency 5
```

### 3. Generate Summaries

```bash
# Quick weekly summary
./git-summary.sh week

# Monthly summary with details
./git-summary.sh month --verbose

# Custom time range
./git-summary.sh period --from 2024-01-01 --to 2024-03-31

# Export to markdown
./git-summary.sh month --format markdown > work-summary.md
```

## Commands

### Repository Management

#### `add-repo <path> [options]`

Add a git repository to track

**Arguments:**

- `<path>` - Path to the git repository

**Options:**

- `-n, --name <name>` - Custom name for the repository

**Examples:**

```bash
./git-summary.sh add-repo .
./git-summary.sh add-repo /path/to/repo --name "My Project"
```

#### `discover <paths...> [options]`

Discover git repositories in specified directories

**Arguments:**

- `<paths...>` - Directory paths to search for git repositories

**Options:**

- `-d, --max-depth <depth>` - Maximum search depth (default: 3)
- `-c, --concurrency <num>` - Number of repositories to process concurrently (default: 3)

**Examples:**

```bash
./git-summary.sh discover ~/work ~/projects
./git-summary.sh discover ~/work --max-depth 2 --concurrency 5
```

#### `list`

List all tracked repositories

**Examples:**

```bash
./git-summary.sh list
```

#### `sync [options]`

Sync all tracked repositories (fetch new commits)

**Options:**

- `-r, --repos <repos...>` - Specific repositories to sync
- `-c, --concurrency <num>` - Number of repositories to process concurrently (default: 3)

**Examples:**

```bash
./git-summary.sh sync
./git-summary.sh sync --repos "project1" "project2"
./git-summary.sh sync --concurrency 5
```

#### `add-org <organization> <paths...> [options]`

Add all repositories from a specific organization that exist in given directories

**Arguments:**

- `<organization>` - Organization name (e.g., 'zenjob', 'microsoft')
- `<paths...>` - Directory paths to search for repositories

**Options:**

- `-d, --max-depth <depth>` - Maximum search depth (default: 3)
- `-c, --concurrency <num>` - Number of repositories to process concurrently (default: 3)
- `-n, --dry-run` - Show what repositories would be added without actually adding them

**Examples:**

```bash
./git-summary.sh add-org mycompany ~/work ~/projects
./git-summary.sh add-org mycompany ~/work --dry-run --max-depth 2
```

### Summary Generation

All summary commands support the following options:

- `-r, --repos <repos...>` - Analyze specific repositories only
- `-f, --format <format>` - Output format: `text`, `json`, `markdown` (default: text)
- `-a, --author <author>` - Filter commits by author name or email
- `--me` - Filter commits by current git user
- `-v, --verbose` - Include detailed information

#### `week [options]`

Generate last week summary (7 days)

#### `month [options]`

Generate last month summary (30 days)

#### `months [options]`

Generate last 3 months summary (90 days)

#### `year [options]`

Generate last year summary (365 days)

#### `ytd [options]`

Generate year-to-date summary

#### `period --from <date> --to <date> [options]`

Generate summary for custom date range

**Required Options:**

- `--from <date>` - Start date (YYYY-MM-DD format)
- `--to <date>` - End date (YYYY-MM-DD format)

#### `repo-detail [options]`

Analyze a specific repository in detail

**Required Options:**

- `-r, --repo <repo>` - Repository name or path to analyze

**Options:**

- `--period <period>` - Time period (1week, 1month, 3months, 6months, 1year, ytd) (default: 1month)
- `--from <date>` - Start date (YYYY-MM-DD) for custom period
- `--to <date>` - End date (YYYY-MM-DD) for custom period
- `-a, --author <author>` - Filter commits by author name or email
- `--me` - Filter commits by current git user
- `-f, --format <format>` - Output format: `text`, `json`, `markdown` (default: text)
- `-v, --verbose` - Verbose output

**Examples:**

```bash
# Predefined periods
./git-summary.sh week --verbose
./git-summary.sh month --format markdown
./git-summary.sh year --repos "project1" "project2"

# Filter by author
./git-summary.sh month --author "john@example.com" --verbose
./git-summary.sh week --me --format json

# Custom period
./git-summary.sh period --from 2024-01-01 --to 2024-03-31 --format json

# Repository detail analysis
./git-summary.sh repo-detail --repo "my-project" --period 3months --verbose
./git-summary.sh repo-detail --repo "my-project" --from 2024-01-01 --to 2024-03-31 --me
```

## Complete Command Reference

```bash
# Repository Management
./git-summary.sh add-repo <path> [--name <name>]
./git-summary.sh discover <paths...> [--max-depth <depth>] [--concurrency <num>]
./git-summary.sh add-org <organization> <paths...> [--max-depth <depth>] [--concurrency <num>] [--dry-run]
./git-summary.sh list
./git-summary.sh sync [--repos <repos...>] [--concurrency <num>]

# Time Period Summaries
./git-summary.sh week [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]
./git-summary.sh month [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]
./git-summary.sh months [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]  # 3 months
./git-summary.sh year [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]
./git-summary.sh ytd [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]

# Custom Period
./git-summary.sh period --from YYYY-MM-DD --to YYYY-MM-DD [--repos <repos...>] [--format <format>] [--author <author>] [--me] [--verbose]

# Repository Detail Analysis
./git-summary.sh repo-detail --repo <repo> [--period <period>] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--author <author>] [--me] [--format <format>] [--verbose]

# Help
./git-summary.sh --help
./git-summary.sh <command> --help
```

## Examples

### Basic Usage

```bash
# Add current project
./git-summary.sh add-repo .

# Get last week's summary
./git-summary.sh week
```

Sample output:

```
📊 Work Summary: Last Week

Period: 2024-01-15 to 2024-01-22
Repositories: 1

📈 Overall Statistics:
  Commits: 23
  Files Changed: 45
  Lines Added: 1,234
  Lines Deleted: 567
  Active Days: 5
  Average Commits/Day: 3.29

💻 Top Languages:
  TypeScript: 856 changes
  JavaScript: 234 changes
  JSON: 123 changes
```

### Advanced Analysis

```bash
# Analyze specific repositories for last quarter
./git-summary.sh months --repos "my-project" "side-project" --verbose --format markdown

# Get detailed yearly summary for current user only
./git-summary.sh year --me --verbose

# Export JSON for external processing
./git-summary.sh month --format json > monthly-report.json

# Detailed repository analysis
./git-summary.sh repo-detail --repo "my-main-project" --period 6months --verbose
```

### Discover and Analyze Multiple Projects

```bash
# Discover all git repositories in your work directories
./git-summary.sh discover ~/work ~/personal/projects

# Add all repositories from a specific organization
./git-summary.sh add-org mycompany ~/work ~/projects --dry-run
./git-summary.sh add-org mycompany ~/work ~/projects

# Generate comprehensive summary
./git-summary.sh months --verbose
```

### Author-Specific Analysis

```bash
# Analyze your own commits only
./git-summary.sh month --me --verbose

# Analyze specific contributor's work
./git-summary.sh period --from 2024-01-01 --to 2024-03-31 --author "jane@company.com"

# Compare team member contributions
./git-summary.sh month --author "john@company.com" --format json > john-stats.json
./git-summary.sh month --author "jane@company.com" --format json > jane-stats.json
```

### Workflow Examples

```bash
# Daily workflow
./git-summary.sh sync --concurrency 5    # Sync all repos quickly
./git-summary.sh week --me --verbose     # Get detailed weekly summary for your work

# Monthly reporting
./git-summary.sh month --format markdown > reports/monthly-$(date +%Y-%m).md

# Project-specific analysis
./git-summary.sh add-repo ~/projects/new-project --name "New Project"
./git-summary.sh repo-detail --repo "New Project" --period 1month --verbose

# Organization onboarding
./git-summary.sh discover ~/work ~/side-projects --max-depth 3 --concurrency 10
./git-summary.sh add-org mycompany ~/work --concurrency 8
./git-summary.sh sync --concurrency 8
./git-summary.sh ytd --format json > yearly-summary.json

# Team analysis
./git-summary.sh month --verbose > team-summary.txt
./git-summary.sh month --me --format markdown > my-contributions.md
```

## Configuration

The tool automatically creates a SQLite database in `./data/git-summary.db` to store:

- Repository metadata
- Commit history and statistics
- File change information
- Cached summaries

## Data Structure

### Repository Information

- Path and name
- Remote URL
- Last sync timestamp
- Commit statistics

### Commit Analysis

- Author and timestamp
- Message content
- File changes (insertions/deletions)
- Language detection

### Generated Statistics

- Commit frequency and trends
- Language usage patterns
- File change patterns
- Productivity metrics

## Development

### Project Structure

```
src/
├── cli/           # Command line interface
│   ├── commands/  # Command definitions and handlers
│   └── index.ts   # Main CLI entry point
├── core/          # Core analysis logic
│   ├── git-analyzer.ts        # Git repository analysis
│   ├── data-aggregator.ts     # Data aggregation and summarization
│   ├── commit-fetcher.ts      # Commit data fetching
│   ├── commit-processor.ts    # Commit data processing
│   └── repository-discovery.ts # Repository discovery logic
├── formatters/    # Output formatters
│   ├── text-formatter.ts      # Text output formatting
│   ├── markdown-formatter.ts  # Markdown output formatting
│   └── calculators.ts         # Statistics calculators
├── storage/       # Database management
│   └── database.ts # SQLite database operations
├── types/         # TypeScript definitions
└── utils/         # Utility functions
    ├── logger.ts    # Logging utilities
    ├── date-utils.ts # Date manipulation helpers
    └── git-utils.ts  # Git-related utilities
```

### Scripts

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Run in development mode with tsx
npm run start      # Run built version from dist/
npm run lint       # Run ESLint on source files
npm run format     # Format code with Prettier
npm run test       # Run test suite
```

## Testing

The project includes a comprehensive test suite built with Jest and TypeScript, ensuring code
quality and reliability across all core functionality.

### Test Setup

The testing environment is configured with:

- **Jest** - Testing framework with TypeScript support via `ts-jest`
- **In-memory SQLite** - Isolated database testing without file system dependencies
- **Mock utilities** - Comprehensive mocking for external dependencies
- **Coverage reporting** - Detailed code coverage analysis

### Running Tests

```bash
# Run all tests
npm test
# or
yarn test

# Run tests with coverage report
npm test -- --coverage
# or
yarn test --coverage

# Run tests in watch mode (development)
npm test -- --watch
# or
yarn test --watch

# Run specific test file
npm test -- tests/core/data-aggregator.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should generate accurate work summary"
```

### Test Coverage

Current test coverage includes:

- **Core Logic**: 36.48% coverage

  - `data-aggregator.ts`: 98.36% (comprehensive business logic testing)
  - `git-analyzer.ts`: 33.33% (integration tests)
  - `database.ts`: 70.78% (storage operations)

- **Utilities**: 66.76% coverage

  - `date-utils.ts`: 97.32% (date manipulation functions)
  - `language-detector.ts`: 73.61% (file extension analysis)

- **Areas for improvement**:
  - CLI commands and handlers (0% coverage)
  - Formatters (0% coverage)
  - Git utilities and remote handling

### Test Structure

```
tests/
├── core/                    # Core functionality tests
│   ├── data-aggregator.test.ts      # Business logic and aggregation
│   ├── database.test.ts             # Database operations
│   └── git-analyzer.integration.test.ts # Git analysis integration
├── utils/                   # Utility function tests
│   └── date-utils.test.ts           # Date manipulation functions
├── helpers/                 # Test utilities and fixtures
│   └── test-fixtures.ts             # Mock data creators
└── setup.ts                # Global test configuration
```

### Testing Patterns

#### 1. **Unit Tests**

Test individual functions and classes in isolation:

```typescript
describe('DataAggregator', () => {
  let db: DatabaseManager;
  let dataAggregator: DataAggregator;

  beforeEach(() => {
    db = createTestDatabase();
    dataAggregator = new DataAggregator(db);
  });

  it('should calculate correct statistics', async () => {
    // Arrange
    const commits = createMockCommits(5);
    commits.forEach(commit => db.addCommit(commit));

    // Act
    const summary = await dataAggregator.generateWorkSummary(timePeriod);

    // Assert
    expect(summary.stats.totalCommits).toBe(5);
  });
});
```

#### 2. **Integration Tests**

Test component interactions and workflows:

```typescript
describe('GitAnalyzer Integration', () => {
  it('should analyze repository and store commits', async () => {
    const analyzer = new GitAnalyzer(db);
    const result = await analyzer.analyzeRepository(repoPath);

    expect(result.success).toBe(true);
    expect(db.getCommitCount()).toBeGreaterThan(0);
  });
});
```

#### 3. **Mock Data Creation**

Consistent test data using factory functions:

```typescript
// Create mock repository
const repo = createMockRepository({
  name: 'test-project',
  path: '/path/to/project',
});

// Create mock commits with specific characteristics
const commit = createMockCommit({
  author: 'John Doe',
  insertions: 50,
  deletions: 10,
  message: 'feat: add authentication',
});
```

#### 4. **Database Testing**

Isolated database testing with in-memory SQLite:

```typescript
beforeEach(() => {
  db = createTestDatabase(); // Creates :memory: database
});

afterEach(() => {
  db.close(); // Clean up after each test
});
```

### Test Configuration

#### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli/index.ts', // Entry point excluded
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};
```

#### Global Test Setup (`tests/setup.ts`)

- Mocks external dependencies (chalk, p-queue)
- Handles ES module compatibility issues
- Cleans up test databases automatically

### Writing New Tests

When adding new features, follow these testing guidelines:

#### 1. **Test File Naming**

- Unit tests: `feature-name.test.ts`
- Integration tests: `feature-name.integration.test.ts`
- Place tests in corresponding directory structure under `tests/`

#### 2. **Test Structure**

```typescript
import { FeatureClass } from '../../src/path/to/feature';
import { createTestDatabase, createMockData } from '../helpers/test-fixtures';

describe('FeatureClass', () => {
  let instance: FeatureClass;

  beforeEach(() => {
    // Setup test environment
    instance = new FeatureClass();
  });

  describe('methodName', () => {
    it('should handle normal case correctly', () => {
      // Arrange
      const input = createMockData();

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle edge cases', () => {
      // Test edge cases, error conditions, etc.
    });
  });
});
```

#### 3. **Test Coverage Goals**

- **Core business logic**: Aim for 90%+ coverage
- **Utility functions**: Aim for 95%+ coverage
- **Integration points**: Focus on happy path and error scenarios
- **CLI commands**: Test command parsing and execution flow

#### 4. **Mock Strategy**

- Use in-memory database for storage tests
- Mock external dependencies (git, file system, network)
- Create realistic test data with factory functions
- Avoid mocking internal application logic

### Continuous Integration

Tests run automatically on:

- Pull requests
- Main branch commits
- Release builds

Coverage reports are generated and can be viewed in the `coverage/` directory after running tests
with the `--coverage` flag.

### Testing Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clarity**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **Edge Cases**: Test boundary conditions, error scenarios, and invalid inputs
5. **Performance**: Keep tests fast by using in-memory databases and minimal setup
6. **Maintainability**: Use helper functions and factories to reduce test code duplication

### Dependencies

**Core Dependencies:**

- `better-sqlite3` - SQLite database operations
- `simple-git` - Git repository interactions
- `commander` - CLI framework
- `chalk` - Terminal styling
- `winston` - Logging
- `openai` - AI integration (ready for future features)

**Development Dependencies:**

- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for development
- `eslint` - Code linting
- `prettier` - Code formatting

### Adding New Features

The architecture is designed for extensibility:

- **New Commands**: Add command handlers in `src/cli/commands/handlers/`
- **New Formatters**: Extend formatters in `src/formatters/`
- **Data Sources**: Extend the analyzer framework in `src/core/`
- **AI Integration**: Leverage existing OpenAI dependency for summaries
- **Export Formats**: Add new output formats to formatters
- **Time Periods**: Add custom period calculations in `src/utils/date-utils.ts`

### Code Quality

The project follows clean code principles:

- TypeScript strict mode enabled
- ESLint configuration for code quality
- Prettier for consistent formatting
- Modular architecture with clear separation of concerns
- Comprehensive error handling and logging

## Future Enhancements

- 🤖 **AI-Powered Summaries** - Natural language summaries of work
- 📊 **Web Dashboard** - Interactive visualizations
- 📧 **Automated Reports** - Scheduled email summaries
- 🔗 **Integration APIs** - Asana, Jira, GitHub Issues
- 📱 **Mobile App** - View summaries on mobile
- 🏆 **Achievement System** - Productivity milestones

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Run linting and formatting (`npm run lint && npm run format`)
5. Ensure the project builds successfully (`npm run build`)
6. Commit your changes with descriptive messages
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Submit a pull request

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-git-summary

# Install dependencies
npm install
# or
yarn install

# Run in development mode
npm run dev --help
# or
./git-summary.sh --help

# Build for production
npm run build
```

## License

MIT License - see LICENSE file for details.

## Support

- 📚 Check the documentation
- 🐛 Report issues on GitHub
- 💡 Suggest features via issues
- 📧 Email: your-email@example.com

---

**Happy coding! 🚀**
