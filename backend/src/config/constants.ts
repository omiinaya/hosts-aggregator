/**
 * Configuration Constants
 *
 * This file contains all application-wide constants for:
 * - Pattern complexity thresholds (ReDoS protection)
 * - Pagination limits
 * - Cache TTL values
 * - Security-related constants
 * - Regex timeout values
 */

// ============================================================================
// Pattern Complexity Thresholds (ReDoS Protection)
// ============================================================================

export const PATTERN_COMPLEXITY = {
  /** Maximum allowed pattern length in characters */
  MAX_PATTERN_LENGTH: 1000,

  /** Maximum allowed nested quantifiers (e.g., (a+)+) */
  MAX_NESTED_QUANTIFIERS: 3,

  /** Maximum allowed alternations (e.g., (a|b|c)) */
  MAX_ALTERNATIONS: 10,

  /** Maximum allowed groups (capturing and non-capturing) */
  MAX_GROUPS: 20,

  /** Maximum allowed backreferences */
  MAX_BACKREFERENCES: 5,

  /** Maximum quantifier repetition value */
  MAX_QUANTIFIER_VALUE: 1000,

  /** Maximum number of character classes [a-z] */
  MAX_CHARACTER_CLASSES: 20,

  /** Maximum number of quantifiers in a pattern */
  MAX_QUANTIFIERS: 30,
} as const;

// ============================================================================
// Regex Execution Timeouts
// ============================================================================

export const REGEX_TIMEOUTS = {
  /** Default regex execution timeout in milliseconds */
  DEFAULT: 1000,

  /** Short timeout for simple patterns */
  SHORT: 500,

  /** Medium timeout for moderate patterns */
  MEDIUM: 1000,

  /** Long timeout for complex patterns (use with caution) */
  LONG: 2000,

  /** Maximum allowed timeout (to prevent abuse) */
  MAXIMUM: 5000,
} as const;

// ============================================================================
// Pagination Limits
// ============================================================================

export const PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 50,

  /** Minimum allowed page size */
  MIN_PAGE_SIZE: 1,

  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 1000,

  /** Default page number */
  DEFAULT_PAGE: 1,

  /** Minimum allowed page number */
  MIN_PAGE: 1,

  /** Maximum allowed page number */
  MAX_PAGE: 10000,
} as const;

// ============================================================================
// Cache TTL Values (in seconds)
// ============================================================================

export const CACHE_TTL = {
  /** Short cache TTL (1 minute) */
  SHORT: 60,

  /** Medium cache TTL (5 minutes) */
  MEDIUM: 300,

  /** Long cache TTL (1 hour) */
  LONG: 3600,

  /** Extended cache TTL (24 hours) */
  EXTENDED: 86400,

  /** Aggregation results cache TTL */
  AGGREGATION_RESULTS: 300,

  /** Source content cache TTL */
  SOURCE_CONTENT: 3600,

  /** Filter rules cache TTL */
  FILTER_RULES: 600,

  /** Configuration cache TTL */
  CONFIGURATION: 3600,

  /** User session cache TTL */
  USER_SESSION: 7200,
} as const;

// ============================================================================
// Security Constants
// ============================================================================

export const SECURITY = {
  /** Maximum request body size in bytes (10MB) */
  MAX_REQUEST_BODY_SIZE: 10 * 1024 * 1024,

  /** Maximum file upload size in bytes (50MB) */
  MAX_FILE_UPLOAD_SIZE: 50 * 1024 * 1024,

  /** Rate limit window in milliseconds (15 minutes) */
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,

  /** Maximum requests per window */
  RATE_LIMIT_MAX_REQUESTS: 1000,

  /** Stricter rate limit for authentication endpoints */
  AUTH_RATE_LIMIT_MAX: 5,

  /** JWT token expiration time (24 hours) */
  JWT_EXPIRATION: '24h',

  /** Refresh token expiration time (7 days) */
  REFRESH_TOKEN_EXPIRATION: '7d',

  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,

  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Maximum failed login attempts before lockout */
  MAX_FAILED_LOGIN_ATTEMPTS: 5,

  /** Account lockout duration in minutes */
  LOCKOUT_DURATION_MINUTES: 30,

  /** API key length */
  API_KEY_LENGTH: 32,

  /** Secure random token length */
  SECURE_TOKEN_LENGTH: 32,
} as const;

// ============================================================================
// Filter Rule Constants
// ============================================================================

export const FILTER_RULES = {
  /** Maximum number of filter rules per source */
  MAX_RULES_PER_SOURCE: 10000,

  /** Maximum filter rule pattern length */
  MAX_RULE_PATTERN_LENGTH: 500,

  /** Default filter rule priority */
  DEFAULT_PRIORITY: 100,

  /** Minimum filter rule priority */
  MIN_PRIORITY: 1,

  /** Maximum filter rule priority */
  MAX_PRIORITY: 1000,

  /** Supported filter rule types */
  RULE_TYPES: ['block', 'allow', 'wildcard', 'regex'] as const,

  /** Wildcard pattern characters */
  WILDCARD_CHARS: ['*', '?'] as const,

  /** Maximum number of wildcard patterns */
  MAX_WILDCARD_PATTERNS: 1000,

  /** Maximum wildcard depth (nested wildcards) */
  MAX_WILDCARD_DEPTH: 3,
} as const;

// ============================================================================
// Aggregation Constants
// ============================================================================

export const AGGREGATION = {
  /** Maximum time to wait for aggregation (5 minutes) */
  MAX_AGGREGATION_TIME: 5 * 60 * 1000,

  /** Batch size for processing entries */
  BATCH_SIZE: 1000,

  /** Maximum sources to process in parallel */
  MAX_PARALLEL_SOURCES: 5,

  /** Retry attempts for failed sources */
  MAX_RETRY_ATTEMPTS: 3,

  /** Retry delay in milliseconds */
  RETRY_DELAY_MS: 1000,

  /** Default aggregation schedule (cron expression) */
  DEFAULT_SCHEDULE: '0 */6 * * *',

  /** Minimum aggregation interval in minutes */
  MIN_AGGREGATION_INTERVAL: 5,

  /** Maximum aggregation interval in minutes */
  MAX_AGGREGATION_INTERVAL: 1440,
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION = {
  /** Maximum source name length */
  MAX_SOURCE_NAME_LENGTH: 255,

  /** Minimum source name length */
  MIN_SOURCE_NAME_LENGTH: 1,

  /** Maximum URL length */
  MAX_URL_LENGTH: 2048,

  /** Maximum metadata size in bytes */
  MAX_METADATA_SIZE: 10000,

  /** Maximum comment length */
  MAX_COMMENT_LENGTH: 1000,

  /** Allowed URL protocols */
  ALLOWED_PROTOCOLS: ['http:', 'https:'] as const,

  /** Domain validation regex */
  DOMAIN_REGEX:
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/,

  /** IPv4 validation regex */
  IPV4_REGEX:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Pattern errors
  PATTERN_TOO_LONG: 'PATTERN_TOO_LONG',
  PATTERN_TOO_COMPLEX: 'PATTERN_TOO_COMPLEX',
  PATTERN_TIMEOUT: 'PATTERN_TIMEOUT',
  PATTERN_INVALID: 'PATTERN_INVALID',
  PATTERN_REDOS_RISK: 'PATTERN_REDOS_RISK',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Security errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Configuration errors
  CONFIG_IMPORT_FAILED: 'CONFIG_IMPORT_FAILED',
  CONFIG_EXPORT_FAILED: 'CONFIG_EXPORT_FAILED',
  CONFIG_INVALID_FORMAT: 'CONFIG_INVALID_FORMAT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

// ============================================================================
// Export Type Aliases
// ============================================================================

export type ErrorCode = keyof typeof ERROR_CODES;
export type FilterRuleType = (typeof FILTER_RULES.RULE_TYPES)[number];
