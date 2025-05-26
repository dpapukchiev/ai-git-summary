# AI Git Summary

An intelligent git activity analyzer that provides comprehensive summaries of your coding work across different time periods. Track your productivity, analyze patterns, and get AI-powered insights into your development activities.

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
```

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
- 🧪 **Testing Suite** - Comprehensive test coverage

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
