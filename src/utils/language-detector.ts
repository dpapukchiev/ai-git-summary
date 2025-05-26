export interface LanguageConfig {
  name: string;
  extensions: string[];
  aliases?: string[];
  category?: 'programming' | 'markup' | 'data' | 'config' | 'documentation';
}

/**
 * Comprehensive language configuration with accurate file extension mappings
 */
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  // JavaScript/TypeScript ecosystem
  {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    category: 'programming',
  },
  {
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    category: 'programming',
  },
  {
    name: 'Vue',
    extensions: ['.vue'],
    category: 'programming',
  },
  {
    name: 'Svelte',
    extensions: ['.svelte'],
    category: 'programming',
  },

  // Backend languages
  {
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi', '.pyx'],
    category: 'programming',
  },
  {
    name: 'Java',
    extensions: ['.java'],
    category: 'programming',
  },
  {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    category: 'programming',
  },
  {
    name: 'C#',
    extensions: ['.cs', '.csx'],
    category: 'programming',
  },
  {
    name: 'Go',
    extensions: ['.go'],
    category: 'programming',
  },
  {
    name: 'Rust',
    extensions: ['.rs'],
    category: 'programming',
  },
  {
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hh', '.hxx'],
    category: 'programming',
  },
  {
    name: 'C',
    extensions: ['.c', '.h'],
    category: 'programming',
  },
  {
    name: 'Ruby',
    extensions: ['.rb', '.rake', '.gemspec'],
    category: 'programming',
  },
  {
    name: 'PHP',
    extensions: ['.php', '.phtml', '.php3', '.php4', '.php5'],
    category: 'programming',
  },
  {
    name: 'Swift',
    extensions: ['.swift'],
    category: 'programming',
  },
  {
    name: 'Groovy',
    extensions: ['.groovy', '.gradle'],
    category: 'programming',
  },

  // Web technologies
  {
    name: 'HTML',
    extensions: ['.html', '.htm', '.xhtml'],
    category: 'markup',
  },
  {
    name: 'CSS',
    extensions: ['.css'],
    category: 'markup',
  },
  {
    name: 'SCSS',
    extensions: ['.scss'],
    category: 'markup',
  },
  {
    name: 'Sass',
    extensions: ['.sass'],
    category: 'markup',
  },
  {
    name: 'Less',
    extensions: ['.less'],
    category: 'markup',
  },

  // Data formats
  {
    name: 'JSON',
    extensions: ['.json', '.jsonc', '.json5'],
    category: 'data',
  },
  {
    name: 'XML',
    extensions: ['.xml', '.xsd', '.xsl', '.xslt'],
    category: 'data',
  },
  {
    name: 'YAML',
    extensions: ['.yml', '.yaml'],
    category: 'data',
  },
  {
    name: 'TOML',
    extensions: ['.toml'],
    category: 'data',
  },
  {
    name: 'CSV',
    extensions: ['.csv'],
    category: 'data',
  },

  // Documentation
  {
    name: 'Markdown',
    extensions: ['.md', '.markdown', '.mdown', '.mkd'],
    category: 'documentation',
  },
  {
    name: 'reStructuredText',
    extensions: ['.rst'],
    category: 'documentation',
  },
  {
    name: 'AsciiDoc',
    extensions: ['.adoc', '.asciidoc'],
    category: 'documentation',
  },

  // Database
  {
    name: 'SQL',
    extensions: ['.sql', '.mysql', '.pgsql', '.plsql'],
    category: 'data',
  },

  // Scripts and config
  {
    name: 'Shell',
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    category: 'programming',
  },
  {
    name: 'PowerShell',
    extensions: ['.ps1', '.psm1', '.psd1'],
    category: 'programming',
  },
  {
    name: 'Dockerfile',
    extensions: ['.dockerfile'],
    aliases: ['dockerfile'],
    category: 'config',
  },
  {
    name: 'Docker Compose',
    extensions: ['.docker-compose.yml', '.docker-compose.yaml'],
    aliases: ['docker-compose.yml', 'docker-compose.yaml'],
    category: 'config',
  },

  // Other languages
  {
    name: 'Dart',
    extensions: ['.dart'],
    category: 'programming',
  },
  {
    name: 'Lua',
    extensions: ['.lua'],
    category: 'programming',
  },
  {
    name: 'R',
    extensions: ['.r', '.R'],
    category: 'programming',
  },
  {
    name: 'Scala',
    extensions: ['.scala', '.sc'],
    category: 'programming',
  },
  {
    name: 'Clojure',
    extensions: ['.clj', '.cljs', '.cljc'],
    category: 'programming',
  },
  {
    name: 'Elixir',
    extensions: ['.ex', '.exs'],
    category: 'programming',
  },
  {
    name: 'Erlang',
    extensions: ['.erl', '.hrl'],
    category: 'programming',
  },
  {
    name: 'Haskell',
    extensions: ['.hs', '.lhs'],
    category: 'programming',
  },
  {
    name: 'F#',
    extensions: ['.fs', '.fsx', '.fsi'],
    category: 'programming',
  },
  {
    name: 'OCaml',
    extensions: ['.ml', '.mli'],
    category: 'programming',
  },
  {
    name: 'Perl',
    extensions: ['.pl', '.pm', '.perl'],
    category: 'programming',
  },
  {
    name: 'Objective-C',
    extensions: ['.m', '.mm'],
    category: 'programming',
  },
  {
    name: 'Assembly',
    extensions: ['.asm', '.s'],
    category: 'programming',
  },
  {
    name: 'MATLAB',
    extensions: ['.m'],
    category: 'programming',
  },
  {
    name: 'Julia',
    extensions: ['.jl'],
    category: 'programming',
  },
  {
    name: 'Nim',
    extensions: ['.nim'],
    category: 'programming',
  },
  {
    name: 'Crystal',
    extensions: ['.cr'],
    category: 'programming',
  },
  {
    name: 'Zig',
    extensions: ['.zig'],
    category: 'programming',
  },
  {
    name: 'V',
    extensions: ['.v'],
    category: 'programming',
  },
  {
    name: 'Solidity',
    extensions: ['.sol'],
    category: 'programming',
  },
  {
    name: 'WebAssembly',
    extensions: ['.wat', '.wasm'],
    category: 'programming',
  },

  // Web and mobile frameworks
  {
    name: 'JSX',
    extensions: ['.jsx'],
    category: 'programming',
  },
  {
    name: 'TSX',
    extensions: ['.tsx'],
    category: 'programming',
  },
  {
    name: 'Handlebars',
    extensions: ['.hbs', '.handlebars'],
    category: 'markup',
  },
  {
    name: 'Mustache',
    extensions: ['.mustache'],
    category: 'markup',
  },
  {
    name: 'EJS',
    extensions: ['.ejs'],
    category: 'markup',
  },
  {
    name: 'Pug',
    extensions: ['.pug', '.jade'],
    category: 'markup',
  },
  {
    name: 'Haml',
    extensions: ['.haml'],
    category: 'markup',
  },
  {
    name: 'Erb',
    extensions: ['.erb'],
    category: 'markup',
  },

  // Data and configuration formats
  {
    name: 'HCL',
    extensions: ['.hcl', '.tf'],
    category: 'config',
  },
  {
    name: 'Terraform',
    extensions: ['.tf', '.tfvars'],
    category: 'config',
  },
  {
    name: 'Ansible',
    extensions: ['.yml', '.yaml'],
    aliases: ['playbook.yml', 'site.yml', 'main.yml'],
    category: 'config',
  },
  {
    name: 'Kubernetes',
    extensions: ['.yml', '.yaml'],
    aliases: ['deployment.yml', 'service.yml', 'configmap.yml'],
    category: 'config',
  },
  {
    name: 'Protocol Buffers',
    extensions: ['.proto'],
    category: 'data',
  },
  {
    name: 'GraphQL',
    extensions: ['.graphql', '.gql'],
    category: 'data',
  },
  {
    name: 'Avro',
    extensions: ['.avsc'],
    category: 'data',
  },
  {
    name: 'Parquet',
    extensions: ['.parquet'],
    category: 'data',
  },
  {
    name: 'Apache Thrift',
    extensions: ['.thrift'],
    category: 'data',
  },

  // Build and project files
  {
    name: 'Gradle',
    extensions: ['.gradle'],
    aliases: ['build.gradle', 'settings.gradle'],
    category: 'config',
  },
  {
    name: 'Maven',
    extensions: ['.xml'],
    aliases: ['pom.xml'],
    category: 'config',
  },
  {
    name: 'CMake',
    extensions: ['.cmake'],
    aliases: ['cmakelists.txt'],
    category: 'config',
  },
  {
    name: 'Makefile',
    extensions: ['.mk'],
    aliases: ['makefile', 'gnumakefile'],
    category: 'config',
  },
  {
    name: 'Bazel',
    extensions: ['.bzl'],
    aliases: ['build', 'workspace'],
    category: 'config',
  },
  {
    name: 'SBT',
    extensions: ['.sbt'],
    category: 'config',
  },

  // Documentation and text
  {
    name: 'LaTeX',
    extensions: ['.tex', '.latex'],
    category: 'documentation',
  },
  {
    name: 'Org Mode',
    extensions: ['.org'],
    category: 'documentation',
  },
  {
    name: 'Rich Text Format',
    extensions: ['.rtf'],
    category: 'documentation',
  },
  {
    name: 'Text',
    extensions: ['.txt', '.text'],
    category: 'documentation',
  },
  {
    name: 'Log',
    extensions: ['.log'],
    category: 'data',
  },

  // Config files
  {
    name: 'Apache Config',
    extensions: ['.conf'],
    aliases: ['.htaccess', 'httpd.conf', 'apache.conf'],
    category: 'config',
  },
  {
    name: 'Nginx Config',
    extensions: ['.conf'],
    aliases: ['nginx.conf'],
    category: 'config',
  },
  {
    name: 'Git Config',
    extensions: ['.gitignore', '.gitattributes', '.gitmodules'],
    aliases: ['.gitignore', '.gitattributes', '.gitmodules'],
    category: 'config',
  },
  {
    name: 'EditorConfig',
    extensions: ['.editorconfig'],
    aliases: ['.editorconfig'],
    category: 'config',
  },
  {
    name: 'ESLint Config',
    extensions: ['.js', '.json'],
    aliases: ['.eslintrc.js', '.eslintrc.json', '.eslintrc'],
    category: 'config',
  },
  {
    name: 'Prettier Config',
    extensions: ['.js', '.json'],
    aliases: ['prettier.config.js', '.prettierrc', '.prettierrc.json'],
    category: 'config',
  },

  // Binary and asset files (categorize separately)
  {
    name: 'Images',
    extensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.svg',
      '.ico',
      '.webp',
    ],
    category: 'data',
  },
  {
    name: 'Fonts',
    extensions: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
    category: 'data',
  },
  {
    name: 'Audio',
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    category: 'data',
  },
  {
    name: 'Video',
    extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'],
    category: 'data',
  },
  {
    name: 'Archives',
    extensions: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'],
    category: 'data',
  },
  {
    name: 'Documents',
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
    category: 'documentation',
  },

  // Additional common config files
  {
    name: 'INI',
    extensions: ['.ini', '.cfg'],
    category: 'config',
  },
  {
    name: 'Properties',
    extensions: ['.properties'],
    category: 'config',
  },
  {
    name: 'ENV',
    extensions: ['.env', '.env.local', '.env.development', '.env.production'],
    category: 'config',
  },
  {
    name: 'Ignore Files',
    extensions: ['.gitignore', '.dockerignore', '.npmignore'],
    aliases: [
      '.gitignore',
      '.dockerignore',
      '.npmignore',
      '.eslintignore',
      '.prettierignore',
    ],
    category: 'config',
  },
  {
    name: 'Rule Files',
    extensions: ['.rules', '.rule'],
    category: 'config',
  },
  {
    name: 'Lock Files',
    extensions: ['.lock'],
    aliases: [
      'package-lock.json',
      'yarn.lock',
      'composer.lock',
      'poetry.lock',
      'cargo.lock',
      'gemfile.lock',
    ],
    category: 'config',
  },

  // Data Science and Notebooks
  {
    name: 'Jupyter Notebook',
    extensions: ['.ipynb'],
    category: 'programming',
  },
  {
    name: 'R Markdown',
    extensions: ['.rmd', '.Rmd'],
    category: 'programming',
  },

  // Rust extensions
  {
    name: 'Rust JSX',
    extensions: ['.rsx'],
    category: 'programming',
  },
];

/**
 * Enhanced language detector that uses file extensions and special file names
 */
export class LanguageDetector {
  private static readonly extensionMap = new Map<string, string>();
  private static readonly fileNameMap = new Map<string, string>();
  private static initialized = false;

  /**
   * Initialize the detector with language configuration
   */
  private static initialize(): void {
    if (this.initialized) return;

    for (const config of LANGUAGE_CONFIGS) {
      // Map extensions to language names
      for (const ext of config.extensions) {
        this.extensionMap.set(ext.toLowerCase(), config.name);
      }

      // Map aliases (for special files like Dockerfile)
      if (config.aliases) {
        for (const alias of config.aliases) {
          this.fileNameMap.set(alias.toLowerCase(), config.name);
        }
      }
    }

    // Special file name mappings
    this.fileNameMap.set('dockerfile', 'Dockerfile');
    this.fileNameMap.set('makefile', 'Makefile');
    this.fileNameMap.set('cmakelists.txt', 'CMake');
    this.fileNameMap.set('rakefile', 'Ruby');
    this.fileNameMap.set('gemfile', 'Ruby');
    this.fileNameMap.set('gemfile.lock', 'Ruby');
    this.fileNameMap.set('vagrantfile', 'Ruby');
    this.fileNameMap.set('package.json', 'JSON');
    this.fileNameMap.set('package-lock.json', 'JSON');
    this.fileNameMap.set('yarn.lock', 'YAML');
    this.fileNameMap.set('composer.json', 'JSON');
    this.fileNameMap.set('composer.lock', 'JSON');
    this.fileNameMap.set('tsconfig.json', 'JSON');
    this.fileNameMap.set('webpack.config.js', 'JavaScript');
    this.fileNameMap.set('vite.config.ts', 'TypeScript');
    this.fileNameMap.set('tailwind.config.js', 'JavaScript');
    this.fileNameMap.set('jest.config.js', 'JavaScript');
    this.fileNameMap.set('babel.config.js', 'JavaScript');
    this.fileNameMap.set('rollup.config.js', 'JavaScript');
    this.fileNameMap.set('gulpfile.js', 'JavaScript');
    this.fileNameMap.set('gruntfile.js', 'JavaScript');
    this.fileNameMap.set('.eslintrc', 'JSON');
    this.fileNameMap.set('.eslintrc.js', 'JavaScript');
    this.fileNameMap.set('.eslintrc.json', 'JSON');
    this.fileNameMap.set('.prettierrc', 'JSON');
    this.fileNameMap.set('.editorconfig', 'INI');
    this.fileNameMap.set('.gitignore', 'Git Config');
    this.fileNameMap.set('.gitattributes', 'Git Config');
    this.fileNameMap.set('.gitmodules', 'Git Config');
    this.fileNameMap.set('requirements.txt', 'Text');
    this.fileNameMap.set('setup.py', 'Python');
    this.fileNameMap.set('pyproject.toml', 'TOML');
    this.fileNameMap.set('poetry.lock', 'TOML');
    this.fileNameMap.set('cargo.toml', 'TOML');
    this.fileNameMap.set('cargo.lock', 'TOML');
    this.fileNameMap.set('go.mod', 'Go');
    this.fileNameMap.set('go.sum', 'Go');
    this.fileNameMap.set('build.gradle', 'Gradle');
    this.fileNameMap.set('settings.gradle', 'Gradle');
    this.fileNameMap.set('gradle.properties', 'Properties');
    this.fileNameMap.set('pom.xml', 'Maven');
    this.fileNameMap.set('build.xml', 'XML');
    this.fileNameMap.set('web.xml', 'XML');
    this.fileNameMap.set('application.properties', 'Properties');
    this.fileNameMap.set('application.yml', 'YAML');
    this.fileNameMap.set('application.yaml', 'YAML');
    this.fileNameMap.set('docker-compose.yml', 'Docker Compose');
    this.fileNameMap.set('docker-compose.yaml', 'Docker Compose');
    this.fileNameMap.set('nginx.conf', 'Nginx Config');
    this.fileNameMap.set('httpd.conf', 'Apache Config');
    this.fileNameMap.set('.htaccess', 'Apache Config');
    this.fileNameMap.set('readme.md', 'Markdown');
    this.fileNameMap.set('readme.txt', 'Text');
    this.fileNameMap.set('changelog.md', 'Markdown');
    this.fileNameMap.set('license', 'Text');
    this.fileNameMap.set('license.txt', 'Text');
    this.fileNameMap.set('copying', 'Text');

    this.initialized = true;
  }

  /**
   * Detect language from file path
   */
  private static detectFromPath(filePath: string): string {
    this.initialize();

    if (!filePath) return 'Other';

    // Normalize path separators and get just the filename
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop()?.toLowerCase() || '';

    // Check for exact file name matches first
    if (this.fileNameMap.has(fileName)) {
      return this.fileNameMap.get(fileName)!;
    }

    // Check for extension matches
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const extension = fileName.substring(lastDotIndex);
      if (this.extensionMap.has(extension)) {
        return this.extensionMap.get(extension)!;
      }

      // Handle compound extensions like .d.ts, .config.js, etc.
      const parts = fileName.split('.');
      if (parts.length > 2) {
        // Try combinations like .config.js, .test.ts, etc.
        for (let i = parts.length - 2; i >= 1; i--) {
          const compoundExt = '.' + parts.slice(i).join('.');
          if (this.extensionMap.has(compoundExt)) {
            return this.extensionMap.get(compoundExt)!;
          }
        }
      }
    }

    // Check for specific patterns in filename
    if (fileName.includes('dockerfile')) return 'Dockerfile';
    if (fileName.includes('makefile')) return 'Makefile';
    if (fileName.endsWith('.config.js')) return 'JavaScript';
    if (fileName.endsWith('.config.ts')) return 'TypeScript';
    if (fileName.endsWith('.test.js') || fileName.endsWith('.spec.js'))
      return 'JavaScript';
    if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts'))
      return 'TypeScript';

    return 'Other';
  }

  /**
   * Get language statistics from file paths with change counts
   */
  static calculateLanguageStats(
    fileChanges: Array<{ filePath: string; changes: number }>
  ): Map<string, number> {
    const languageStats = new Map<string, number>();

    for (const { filePath, changes } of fileChanges) {
      const language = this.detectFromPath(filePath);
      const currentCount = languageStats.get(language) || 0;
      languageStats.set(language, currentCount + changes);
    }

    return languageStats;
  }

  /**
   * Filter out "Other" category if it's less than a threshold and there are enough real languages
   */
  static filterAndSortLanguages(
    languageStats: Map<string, number>,
    maxResults: number = 10,
    otherThreshold: number = 0.1 // 10% threshold
  ): Array<{ language: string; changes: number }> {
    const sortedLanguages = Array.from(languageStats.entries())
      .map(([language, changes]) => ({ language, changes }))
      .sort((a, b) => b.changes - a.changes);

    const totalChanges = sortedLanguages.reduce(
      (sum, lang) => sum + lang.changes,
      0
    );
    const otherEntry = sortedLanguages.find(lang => lang.language === 'Other');

    // If "Other" exists but represents less than threshold of total changes, filter it out
    if (otherEntry && sortedLanguages.length > 3) {
      const otherPercentage = otherEntry.changes / totalChanges;
      if (otherPercentage < otherThreshold) {
        const filtered = sortedLanguages.filter(
          lang => lang.language !== 'Other'
        );
        if (filtered.length >= 3) {
          return filtered.slice(0, maxResults);
        }
      }
    }

    return sortedLanguages.slice(0, maxResults);
  }

  /**
   * Debug method to show which file paths are being categorized as "Other"
   * Useful for improving language detection coverage
   */
  static analyzeOtherFiles(
    fileChanges: Array<{ filePath: string; changes: number }>,
    maxSamples: number = 20
  ): {
    otherFiles: Array<{ filePath: string; changes: number }>;
    totalOtherChanges: number;
    commonExtensions: Array<{ extension: string; count: number }>;
  } {
    const otherFiles = fileChanges
      .filter(({ filePath }) => this.detectFromPath(filePath) === 'Other')
      .sort((a, b) => b.changes - a.changes)
      .slice(0, maxSamples);

    const totalOtherChanges = fileChanges
      .filter(({ filePath }) => this.detectFromPath(filePath) === 'Other')
      .reduce((sum, file) => sum + file.changes, 0);

    // Analyze common extensions in "Other" files
    const extensionCounts = new Map<string, number>();
    for (const { filePath } of fileChanges) {
      if (this.detectFromPath(filePath) === 'Other') {
        const extension = this.extractExtension(filePath);
        if (extension) {
          const current = extensionCounts.get(extension) || 0;
          extensionCounts.set(extension, current + 1);
        }
      }
    }

    const commonExtensions = Array.from(extensionCounts.entries())
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      otherFiles,
      totalOtherChanges,
      commonExtensions,
    };
  }

  /**
   * Extract file extension from path for debugging purposes
   */
  private static extractExtension(filePath: string): string | null {
    const fileName = filePath.split('/').pop() || '';
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : null;
  }
}
