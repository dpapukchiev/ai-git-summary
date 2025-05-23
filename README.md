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

### Summary Generation

All summary commands support the following options:

- `-r, --repos <repos...>` - Analyze specific repositories only
- `-f, --format <format>` - Output format: `text`, `json`, `markdown` (default: text)
- `-v, --verbose` - Include detailed information

#### `week [options]`

Generate last week summary (7 days)

#### `month [options]`

Generate last month summary (30 days)

#### `months [options]`

Generate last 3 months summary (90 days)

#### `months [options]`

Generate last 6 months summary (180 days)

#### `year [options]`

Generate last year summary (365 days)

#### `ytd [options]`

Generate year-to-date summary

#### `period --from <date> --to <date> [options]`

Generate summary for custom date range

**Required Options:**

- `--from <date>` - Start date (YYYY-MM-DD format)
- `--to <date>` - End date (YYYY-MM-DD format)

**Examples:**

```bash
# Predefined periods
./git-summary.sh week --verbose
./git-summary.sh month --format markdown
./git-summary.sh year --repos "project1" "project2"

# Custom period
./git-summary.sh period --from 2024-01-01 --to 2024-03-31 --format json
```

## Complete Command Reference

```bash
# Repository Management
./git-summary.sh add-repo <path> [--name <name>]
./git-summary.sh discover <paths...> [--max-depth <depth>] [--concurrency <num>]
./git-summary.sh list
./git-summary.sh sync [--repos <repos...>] [--concurrency <num>]

# Time Period Summaries
./git-summary.sh week [--repos <repos...>] [--format <format>] [--verbose]
./git-summary.sh month [--repos <repos...>] [--format <format>] [--verbose]
./git-summary.sh months [--repos <repos...>] [--format <format>] [--verbose]  # 3 months
./git-summary.sh months [--repos <repos...>] [--format <format>] [--verbose]  # 6 months
./git-summary.sh year [--repos <repos...>] [--format <format>] [--verbose]
./git-summary.sh ytd [--repos <repos...>] [--format <format>] [--verbose]

# Custom Period
./git-summary.sh period --from YYYY-MM-DD --to YYYY-MM-DD [--repos <repos...>] [--format <format>] [--verbose]

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

# Get detailed yearly summary
./git-summary.sh year --verbose

# Export JSON for external processing
./git-summary.sh month --format json > monthly-report.json
```

### Discover and Analyze Multiple Projects

```bash
# Discover all git repositories in your work directories
./git-summary.sh discover ~/work ~/personal/projects

# Generate comprehensive summary
./git-summary.sh months --verbose
```

### Workflow Examples

```bash
# Daily workflow
./git-summary.sh sync --concurrency 5    # Sync all repos quickly
./git-summary.sh week --verbose          # Get detailed weekly summary

# Monthly reporting
./git-summary.sh month --format markdown > reports/monthly-$(date +%Y-%m).md

# Project-specific analysis
./git-summary.sh add-repo ~/projects/new-project --name "New Project"
./git-summary.sh month --repos "New Project" --verbose

# Batch discovery and analysis
./git-summary.sh discover ~/work ~/side-projects --max-depth 3 --concurrency 10
./git-summary.sh sync --concurrency 8
./git-summary.sh ytd --format json > yearly-summary.json
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
├── core/          # Core analysis logic
├── storage/       # Database management
├── types/         # TypeScript definitions
└── utils/         # Utility functions
```

### Scripts

```bash
npm run build      # Compile TypeScript
npm run dev        # Run in development mode
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Adding New Features

The architecture is designed for extensibility:

- **New Data Sources**: Extend the analyzer framework
- **AI Integration**: Add summary generation with OpenAI/Anthropic
- **Export Formats**: Add new output formats
- **Time Periods**: Add custom period calculations

## Future Enhancements

- 🤖 **AI-Powered Summaries** - Natural language summaries of work
- 📊 **Web Dashboard** - Interactive visualizations
- 📧 **Automated Reports** - Scheduled email summaries
- 🔗 **Integration APIs** - Asana, Jira, GitHub Issues
- 📱 **Mobile App** - View summaries on mobile
- 🏆 **Achievement System** - Productivity milestones

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📚 Check the documentation
- 🐛 Report issues on GitHub
- 💡 Suggest features via issues
- 📧 Email: your-email@example.com

---

**Happy coding! 🚀**
