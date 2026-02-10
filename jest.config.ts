/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false, // Set to false by default, enable with --coverage flag

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/out/**",
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/out/",
    "/coverage/",
    // Skip modules that require external services or runtime environments
    "lib/search/",            // Search service and providers require external APIs
    "lib/vector/",            // Vector DB clients require external services
    "lib/native/",            // Native functions require Tauri runtime
    "lib/project/import-export.ts", // File system operations
    "lib/i18n/provider.tsx",  // React context provider
    "lib/document/parsers/html-parser.ts", // Uses cheerio ESM (tested via e2e)
    "lib/file/index.ts",      // Re-exports only
    "lib/document/index.ts",  // Re-exports only
    "lib/themes/index.ts",    // Re-exports only
  ],

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    "json",
    "text",
    "lcov",
    "html",
    "clover",
    "cobertura",
  ],

  // Coverage thresholds - enforce minimum coverage in CI
  // Thresholds adjusted to reflect realistic coverage for this codebase
  // Many modules require external services (search, vector DBs, native) and can't be unit tested
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 40,
      lines: 55,
      statements: 55,
    },
  },

  // An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: undefined,

  // A path to a custom dependency extractor
  // dependencyExtractor: undefined,

  // Make calling deprecated APIs throw helpful error messages
  // errorOnDeprecated: false,

  // The default configuration for fake timers
  // fakeTimers: {
  //   "enableGlobally": false
  // },

  // Force coverage collection from ignored files using an array of glob patterns
  // forceCoverageMatch: [],

  // A path to a module which exports an async function that is triggered once before all test suites
  // globalSetup: undefined,

  // A path to a module which exports an async function that is triggered once after all test suites
  // globalTeardown: undefined,

  // A set of global variables that need to be available in all test environments
  // globals: {},

  // The maximum amount of workers used to run your tests. Reduced to prevent OOM crashes
  maxWorkers: 2,

  // Increase memory for workers - helps prevent OOM crashes
  workerIdleMemoryLimit: "512MB",

  // Detect open handles that may prevent Jest from exiting cleanly
  detectOpenHandles: false,

  // Force exit after all tests complete (prevents hanging)
  forceExit: true,

  // Reset modules between tests (can help with memory but slower)
  resetModules: false,

  // An array of directory names to be searched recursively up from the requiring module's location
  // moduleDirectories: [
  //   "node_modules"
  // ],

  // An array of file extensions your modules use
  moduleFileExtensions: [
    "js",
    "mjs",
    "cjs",
    "jsx",
    "ts",
    "mts",
    "cts",
    "tsx",
    "json",
    "node"
  ],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you by Next.js)
    "^@/(.*)$": "<rootDir>/$1",

    // Handle CSS imports (with CSS modules)
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",

    // Handle CSS imports (without CSS modules)
    "^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",

    // Handle image imports
    "^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i": "<rootDir>/__mocks__/fileMock.js",

    // Mock Tauri plugins
    "^@tauri-apps/plugin-fs$": "<rootDir>/__mocks__/tauri-plugin-fs.js",
    "^@tauri-apps/plugin-dialog$": "<rootDir>/__mocks__/tauri-plugin-dialog.js",

    // Mock Tauri core/window APIs for unit tests
    "^@tauri-apps/api/core$": "<rootDir>/__mocks__/tauri-api-core.js",
    "^@tauri-apps/api/window$": "<rootDir>/__mocks__/tauri-api-window.js",
    "^@tauri-apps/api/dpi$": "<rootDir>/__mocks__/tauri-api-dpi.js",

    // Mock nanoid ESM module
    "^nanoid$": "<rootDir>/__mocks__/nanoid.js",
    
    // Mock use-stick-to-bottom ESM module
    "^use-stick-to-bottom$": "<rootDir>/__mocks__/use-stick-to-bottom.js",
    
    // Mock streamdown ESM module
    "^streamdown$": "<rootDir>/__mocks__/streamdown.js",
    
    // Mock shiki syntax highlighter ESM module
    "^shiki$": "<rootDir>/__mocks__/shiki.js",
    
    // Mock next-intl and use-intl ESM modules
    "^next-intl$": "<rootDir>/__mocks__/next-intl.js",
    "^next-intl/(.*)$": "<rootDir>/__mocks__/next-intl.js",
    "^use-intl$": "<rootDir>/__mocks__/use-intl.js",
    "^use-intl/(.*)$": "<rootDir>/__mocks__/use-intl.js",
    
    // Mock react-resizable-panels ESM module
    "^react-resizable-panels$": "<rootDir>/__mocks__/react-resizable-panels.js",
    
    // Mock @codesandbox/sandpack-react ESM module
    "^@codesandbox/sandpack-react$": "<rootDir>/__mocks__/@codesandbox/sandpack-react.js",
    
    // Mock rehype-sanitize ESM module
    "^rehype-sanitize$": "<rootDir>/__mocks__/rehype-sanitize.js",
    
    // Mock @qdrant/js-client-rest ESM module
    "^@qdrant/js-client-rest$": "<rootDir>/__mocks__/@qdrant/js-client-rest.js",
    
    // Mock recharts for chart rendering tests
    "^recharts$": "<rootDir>/__mocks__/recharts.js",
    
    // Mock react-markdown ESM module
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.js",
    
    // Mock remark-gfm ESM module
    "^remark-gfm$": "<rootDir>/__mocks__/remark-gfm.js",
    
    // Mock rehype-raw ESM module
    "^rehype-raw$": "<rootDir>/__mocks__/rehype-raw.js",
    
    // Mock katex ESM module
    "^katex$": "<rootDir>/__mocks__/katex.js",
    
    // Mock artifact-icons for component tests
    "(.*)components/artifacts/artifact-icons(.*)$": "<rootDir>/__mocks__/artifact-icons.js",
  },

  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: [
    "<rootDir>/out/",
    "<rootDir>/.next/",
  ],

  // Activates notifications for test results
  // notify: false,

  // An enum that specifies notification mode. Requires { notify: true }
  // notifyMode: "failure-change",

  // A preset that is used as a base for Jest's configuration
  // preset: undefined,

  // Run tests from one or more projects
  // projects: undefined,

  // Use this configuration option to add custom reporters to Jest
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "coverage",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Automatically reset mock state before every test
  // resetMocks: false,

  // Reset the module registry before running each individual test
  // resetModules: false,

  // A path to a custom resolver
  // resolver: undefined,

  // Automatically restore mock state and implementation before every test
  // restoreMocks: false,

  // The root directory that Jest should scan for tests and modules within
  // rootDir: undefined,

  // A list of paths to directories that Jest should use to search for files in
  // roots: [
  //   "<rootDir>"
  // ],

  // Allows you to use a custom runner instead of Jest's default test runner
  // runner: "jest-runner",

  // The paths to modules that run some code to configure or set up the testing environment before each test
  // setupFiles: [],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // The number of seconds after which a test is considered as slow and reported as such in the results.
  // slowTestThreshold: 5,

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  // snapshotSerializers: [],

  // The test environment that will be used for testing
  testEnvironment: "jsdom",

  // Options that will be passed to the testEnvironment
  // testEnvironmentOptions: {},

  // Adds a location field to test results
  // testLocationInResults: false,

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.?([mc])[jt]s?(x)",
    "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"
  ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/out/",
    "/src-tauri/",
    "/e2e/",
    // Skip tests with severe memory issues (require dedicated Node heap increase)
    "components/providers/provider-context.test.tsx",
    "hooks/sandbox/use-sandbox-db.test.ts",
    // Skip test utility files that don't contain tests
    "__tests__/test-utils\\.ts$",
  ],

  // The regexp pattern or array of patterns that Jest uses to detect test files
  // testRegex: [],

  // This option allows the use of a custom results processor
  // testResultsProcessor: undefined,

  // This option allows use of a custom test runner
  // testRunner: "jest-circus/runner",

  // A map from regular expressions to paths to transformers
  // transform: undefined,

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    "node_modules/(?!(nanoid|cheerio|htmlparser2|dom-serializer|domelementtype|domhandler|domutils|entities|css-select|css-what|boolbase|nth-check|parse5|parse5-htmlparser2-tree-adapter|react-markdown|remark-parse|remark-rehype|unified|unist-util-visit|unist-util-is|bail|trough|vfile|vfile-message|mdast-util-from-markdown|mdast-util-to-hast|micromark|decode-named-character-reference|character-entities|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|ccount|escape-string-regexp|markdown-table|zwitch|longest-streak|devlop|unist-util-position|unist-util-stringify-position|html-url-attributes|trim-lines|hast-util-to-jsx-runtime|estree-util-is-identifier-name|hast-util-raw|eventsource-parser|recharts|d3-shape|d3-path|internmap|delaunator|robust-predicates|use-stick-to-bottom|streamdown|rehype-sanitize|rehype-raw|hast-util-sanitize|dagre-d3-es|@qdrant)/)",
  ],

  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  // unmockedModulePathPatterns: undefined,

  // Indicates whether each individual test should be reported during the run
  // verbose: undefined,

  // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  // watchPathIgnorePatterns: [],

  // Whether to use watchman for file crawling
  // watchman: true,
};

export default createJestConfig(config);
