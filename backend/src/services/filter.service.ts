/**
 * Filter Service
 *
 * Provides pattern filtering with ReDoS (Regular Expression Denial of Service) protection.
 * Includes features:
 * - Pattern validation with complexity scoring
 * - Regex execution with timeouts
 * - Wildcard pattern support
 * - Priority-based rule evaluation
 * - Protection against catastrophic backtracking
 */

import { logger } from '../utils/logger';
import { PATTERN_COMPLEXITY, REGEX_TIMEOUTS, FILTER_RULES, ERROR_CODES } from '../config/constants';

// ============================================================================
// Types
// ============================================================================

export interface FilterRule {
  id: string;
  pattern: string;
  type: 'block' | 'allow' | 'wildcard' | 'regex';
  priority: number;
  enabled: boolean;
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternValidationResult {
  valid: boolean;
  complexity: number;
  issues: string[];
  isReDoSRisk: boolean;
}

export interface FilterMatch {
  matched: boolean;
  rule?: FilterRule;
  domain: string;
  matchTime: number;
}

export interface FilterStats {
  totalRules: number;
  enabledRules: number;
  patternsEvaluated: number;
  matchesFound: number;
  averageMatchTime: number;
}

// ============================================================================
// Pattern Complexity Analyzer
// ============================================================================

class PatternComplexityAnalyzer {
  /**
   * Analyzes a regex pattern for complexity and ReDoS risk
   */
  analyze(pattern: string): PatternValidationResult {
    const issues: string[] = [];
    let complexity = 0;
    let isReDoSRisk = false;

    // Check pattern length
    if (pattern.length > PATTERN_COMPLEXITY.MAX_PATTERN_LENGTH) {
      issues.push(
        `Pattern exceeds maximum length of ${PATTERN_COMPLEXITY.MAX_PATTERN_LENGTH} characters`
      );
      complexity += 100;
    }

    // Analyze quantifiers
    const quantifierCount = this.countQuantifiers(pattern);
    if (quantifierCount > PATTERN_COMPLEXITY.MAX_QUANTIFIERS) {
      issues.push(
        `Pattern contains too many quantifiers (${quantifierCount} > ${PATTERN_COMPLEXITY.MAX_QUANTIFIERS})`
      );
      complexity += quantifierCount * 2;
    }

    // Check for nested quantifiers (dangerous pattern like (a+)+)
    const nestedQuantifiers = this.countNestedQuantifiers(pattern);
    if (nestedQuantifiers > PATTERN_COMPLEXITY.MAX_NESTED_QUANTIFIERS) {
      issues.push(
        `Pattern has ${nestedQuantifiers} nested quantifiers (max: ${PATTERN_COMPLEXITY.MAX_NESTED_QUANTIFIERS}) - ReDoS risk`
      );
      isReDoSRisk = true;
      complexity += nestedQuantifiers * 50;
    }

    // Check for alternations
    const alternationCount = this.countAlternations(pattern);
    if (alternationCount > PATTERN_COMPLEXITY.MAX_ALTERNATIONS) {
      issues.push(
        `Pattern contains too many alternations (${alternationCount} > ${PATTERN_COMPLEXITY.MAX_ALTERNATIONS})`
      );
      complexity += alternationCount * 5;
    }

    // Check for groups
    const groupCount = this.countGroups(pattern);
    if (groupCount > PATTERN_COMPLEXITY.MAX_GROUPS) {
      issues.push(
        `Pattern contains too many groups (${groupCount} > ${PATTERN_COMPLEXITY.MAX_GROUPS})`
      );
      complexity += groupCount * 3;
    }

    // Check for backreferences
    const backreferenceCount = this.countBackreferences(pattern);
    if (backreferenceCount > PATTERN_COMPLEXITY.MAX_BACKREFERENCES) {
      issues.push(
        `Pattern contains too many backreferences (${backreferenceCount} > ${PATTERN_COMPLEXITY.MAX_BACKREFERENCES})`
      );
      complexity += backreferenceCount * 10;
    }

    // Check for exponential patterns
    const hasExponentialPattern = this.checkExponentialPatterns(pattern);
    if (hasExponentialPattern) {
      issues.push('Pattern contains exponential complexity (catastrophic backtracking risk)');
      isReDoSRisk = true;
      complexity += 500;
    }

    // Validate regex syntax
    try {
      new RegExp(pattern);
    } catch (error) {
      issues.push(
        `Invalid regex syntax: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      complexity = Infinity;
    }

    const valid = complexity < 500 && issues.length === 0;

    return {
      valid,
      complexity,
      issues,
      isReDoSRisk,
    };
  }

  private countQuantifiers(pattern: string): number {
    // Match *, +, ?, {n}, {n,}, {n,m}
    const quantifierRegex = /[*+?]|\{\d+(?:,\d*)?\}/g;
    return (pattern.match(quantifierRegex) || []).length;
  }

  private countNestedQuantifiers(pattern: string): number {
    let depth = 0;
    let maxDepth = 0;
    let inQuantifier = false;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (char === '(' && !this.isEscaped(pattern, i)) {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === ')' && !this.isEscaped(pattern, i)) {
        depth = Math.max(0, depth - 1);
      }

      // Check if we're inside a quantifier
      if (depth > 0 && (char === '*' || char === '+' || char === '?')) {
        inQuantifier = true;
      }
    }

    return inQuantifier ? maxDepth : 0;
  }

  private countAlternations(pattern: string): number {
    // Count | operators outside character classes
    let count = 0;
    let inCharacterClass = false;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (char === '[' && !this.isEscaped(pattern, i)) {
        inCharacterClass = true;
      } else if (char === ']' && !this.isEscaped(pattern, i)) {
        inCharacterClass = false;
      } else if (char === '|' && !inCharacterClass && !this.isEscaped(pattern, i)) {
        count++;
      }
    }

    return count;
  }

  private countGroups(pattern: string): number {
    // Match ( but not (? (non-capturing) or \( (escaped)
    const groupRegex = /(?<!\\)\((?!\?)/g;
    return (pattern.match(groupRegex) || []).length;
  }

  private countBackreferences(pattern: string): number {
    // Match \1, \2, etc.
    const backrefRegex = /\\\d+/g;
    return (pattern.match(backrefRegex) || []).length;
  }

  private checkExponentialPatterns(pattern: string): boolean {
    // Check for dangerous patterns like (a+)+, (a*)*, (a+)*, etc.
    const dangerousPatterns = [
      /\([^)]*[*+][^)]*\)[*+]/, // Group with quantifier followed by quantifier
      /\([^)]*\)\\1/, // Backreference to a quantified group (using \\1 for string literal)
      /\([^)]*[*+]\)\{/, // Quantified group with repetition
    ];

    return dangerousPatterns.some((p) => {
      try {
        return p.test(pattern);
      } catch {
        // Invalid regex, skip this check
        return false;
      }
    });
  }

  private isEscaped(pattern: string, index: number): boolean {
    let backslashCount = 0;
    for (let i = index - 1; i >= 0 && pattern[i] === '\\'; i--) {
      backslashCount++;
    }
    return backslashCount % 2 === 1;
  }
}

// ============================================================================
// Timeout Regex Executor
// ============================================================================

class TimeoutRegex {
  /**
   * Executes a regex with a timeout to prevent ReDoS attacks
   */
  static test(
    pattern: string,
    input: string,
    timeoutMs: number = REGEX_TIMEOUTS.DEFAULT
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const regex = new RegExp(pattern);
      const startTime = Date.now();

      // Use setImmediate to allow event loop to process timeout
      const checkTimeout = () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(ERROR_CODES.PATTERN_TIMEOUT));
          return;
        }

        try {
          const result = regex.test(input);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      setImmediate(checkTimeout);
    });
  }

  /**
   * Executes regex match with timeout
   */
  static match(
    pattern: string,
    input: string,
    timeoutMs: number = REGEX_TIMEOUTS.DEFAULT
  ): Promise<RegExpMatchArray | null> {
    return new Promise((resolve, reject) => {
      const regex = new RegExp(pattern);
      const startTime = Date.now();

      const checkTimeout = () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(ERROR_CODES.PATTERN_TIMEOUT));
          return;
        }

        try {
          const result = input.match(regex);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      setImmediate(checkTimeout);
    });
  }
}

// ============================================================================
// Wildcard Pattern Matcher
// ============================================================================

class WildcardMatcher {
  /**
   * Converts a wildcard pattern to a safe regex
   * Supports * (any chars) and ? (single char)
   */
  static toRegex(pattern: string): string {
    // Escape special regex characters except * and ?
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    // Add anchors
    return `^${regex}$`;
  }

  /**
   * Validates wildcard pattern
   */
  static validate(pattern: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (pattern.length > FILTER_RULES.MAX_RULE_PATTERN_LENGTH) {
      issues.push(`Pattern exceeds maximum length of ${FILTER_RULES.MAX_RULE_PATTERN_LENGTH}`);
    }

    // Check wildcard depth
    const asteriskCount = (pattern.match(/\*/g) || []).length;
    if (asteriskCount > FILTER_RULES.MAX_WILDCARD_DEPTH) {
      issues.push(
        `Pattern has too many wildcards (${asteriskCount} > ${FILTER_RULES.MAX_WILDCARD_DEPTH})`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Matches a domain against a wildcard pattern
   */
  static match(pattern: string, domain: string): boolean {
    const validation = this.validate(pattern);
    if (!validation.valid) {
      return false;
    }

    try {
      const regex = new RegExp(this.toRegex(pattern), 'i');
      return regex.test(domain);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Filter Service
// ============================================================================

export class FilterService {
  private rules: Map<string, FilterRule> = new Map();
  private complexityAnalyzer: PatternComplexityAnalyzer;
  private matchStats: Map<string, number> = new Map();
  private totalMatchTime: number = 0;
  private matchCount: number = 0;

  constructor() {
    this.complexityAnalyzer = new PatternComplexityAnalyzer();
    logger.info('FilterService initialized with ReDoS protection');
  }

  /**
   * Validates a filter rule pattern
   */
  validatePattern(pattern: string, type: FilterRule['type']): PatternValidationResult {
    // Wildcard patterns have simpler validation
    if (type === 'wildcard') {
      const validation = WildcardMatcher.validate(pattern);
      return {
        valid: validation.valid,
        complexity: 10,
        issues: validation.issues,
        isReDoSRisk: false,
      };
    }

    // Regex patterns need full complexity analysis
    if (type === 'regex') {
      return this.complexityAnalyzer.analyze(pattern);
    }

    // Block and allow are treated as exact matches or simple wildcards
    const isWildcard = pattern.includes('*') || pattern.includes('?');
    if (isWildcard) {
      return WildcardMatcher.validate(pattern) as PatternValidationResult;
    }

    // Simple exact match
    return {
      valid: pattern.length > 0 && pattern.length <= PATTERN_COMPLEXITY.MAX_PATTERN_LENGTH,
      complexity: 1,
      issues: [],
      isReDoSRisk: false,
    };
  }

  /**
   * Adds a new filter rule
   */
  addRule(rule: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>): FilterRule {
    // Validate the pattern
    const validation = this.validatePattern(rule.pattern, rule.type);
    if (!validation.valid) {
      const error = new Error(`Invalid pattern: ${validation.issues.join(', ')}`);
      (error as any).code = ERROR_CODES.PATTERN_INVALID;
      throw error;
    }

    if (validation.isReDoSRisk) {
      const error = new Error(`Pattern has ReDoS risk: ${validation.issues.join(', ')}`);
      (error as any).code = ERROR_CODES.PATTERN_REDOS_RISK;
      throw error;
    }

    const newRule: FilterRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);
    logger.debug(`Added filter rule: ${newRule.id} (${newRule.type}: ${newRule.pattern})`);

    return newRule;
  }

  /**
   * Updates an existing filter rule
   */
  updateRule(id: string, updates: Partial<Omit<FilterRule, 'id' | 'createdAt'>>): FilterRule {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Filter rule not found: ${id}`);
    }

    // If pattern or type is being updated, re-validate
    if (updates.pattern || updates.type) {
      const pattern = updates.pattern || rule.pattern;
      const type = updates.type || rule.type;
      const validation = this.validatePattern(pattern, type);

      if (!validation.valid) {
        const error = new Error(`Invalid pattern: ${validation.issues.join(', ')}`);
        (error as any).code = ERROR_CODES.PATTERN_INVALID;
        throw error;
      }
    }

    const updatedRule: FilterRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  /**
   * Removes a filter rule
   */
  removeRule(id: string): boolean {
    const existed = this.rules.delete(id);
    if (existed) {
      logger.debug(`Removed filter rule: ${id}`);
    }
    return existed;
  }

  /**
   * Gets a filter rule by ID
   */
  getRule(id: string): FilterRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Gets all filter rules
   */
  getAllRules(options?: { enabled?: boolean; type?: FilterRule['type'] }): FilterRule[] {
    let rules = Array.from(this.rules.values());

    if (options?.enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === options.enabled);
    }

    if (options?.type) {
      rules = rules.filter((r) => r.type === options.type);
    }

    // Sort by priority (lower = higher priority)
    return rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Tests if a domain matches any filter rules
   * Returns the first matching rule (highest priority)
   */
  async testDomain(domain: string): Promise<FilterMatch> {
    const startTime = Date.now();
    const enabledRules = this.getAllRules({ enabled: true });

    for (const rule of enabledRules) {
      try {
        let matched = false;

        switch (rule.type) {
          case 'block':
          case 'allow':
            matched = this.matchExactOrWildcard(rule.pattern, domain);
            break;

          case 'wildcard':
            matched = WildcardMatcher.match(rule.pattern, domain);
            break;

          case 'regex':
            matched = await TimeoutRegex.test(rule.pattern, domain, REGEX_TIMEOUTS.DEFAULT);
            break;
        }

        if (matched) {
          const matchTime = Date.now() - startTime;
          this.recordMatch(matchTime);

          return {
            matched: true,
            rule,
            domain,
            matchTime,
          };
        }
      } catch (error) {
        // Log error but continue checking other rules
        logger.warn(`Filter rule ${rule.id} failed for domain ${domain}:`, error);

        if ((error as Error).message === ERROR_CODES.PATTERN_TIMEOUT) {
          // Disable rule that times out
          this.updateRule(rule.id, { enabled: false });
          logger.warn(`Disabled filter rule ${rule.id} due to timeout`);
        }
      }
    }

    const matchTime = Date.now() - startTime;
    this.recordMatch(matchTime);

    return {
      matched: false,
      domain,
      matchTime,
    };
  }

  /**
   * Tests multiple domains efficiently
   */
  async testDomains(domains: string[]): Promise<FilterMatch[]> {
    return Promise.all(domains.map((domain) => this.testDomain(domain)));
  }

  /**
   * Clears all filter rules
   */
  clearRules(): void {
    this.rules.clear();
    this.matchStats.clear();
    this.totalMatchTime = 0;
    this.matchCount = 0;
    logger.info('All filter rules cleared');
  }

  /**
   * Gets filter statistics
   */
  getStats(): FilterStats {
    const allRules = this.getAllRules();
    const enabledRules = this.getAllRules({ enabled: true });

    return {
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      patternsEvaluated: this.matchCount,
      matchesFound: Array.from(this.matchStats.values()).reduce((a, b) => a + b, 0),
      averageMatchTime: this.matchCount > 0 ? this.totalMatchTime / this.matchCount : 0,
    };
  }

  /**
   * Checks if a pattern would be safe to use
   */
  checkPatternSafety(pattern: string, type: FilterRule['type']): PatternValidationResult {
    return this.validatePattern(pattern, type);
  }

  /**
   * Bulk import rules with validation
   */
  async importRules(
    rules: Array<Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    const results = { imported: 0, failed: 0, errors: [] as string[] };

    for (const rule of rules) {
      try {
        this.addRule(rule);
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Failed to import rule "${rule.pattern}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    logger.info(`Imported ${results.imported} filter rules, ${results.failed} failed`);
    return results;
  }

  /**
   * Exports all filter rules
   */
  exportRules(): FilterRule[] {
    return this.getAllRules();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private matchExactOrWildcard(pattern: string, domain: string): boolean {
    // Check if it's a wildcard pattern
    if (pattern.includes('*') || pattern.includes('?')) {
      return WildcardMatcher.match(pattern, domain);
    }

    // Exact match (case-insensitive)
    return pattern.toLowerCase() === domain.toLowerCase();
  }

  private recordMatch(matchTime: number): void {
    this.matchCount++;
    this.totalMatchTime += matchTime;

    // Keep stats bounded
    if (this.matchCount > 1000000) {
      this.matchCount = 1;
      this.totalMatchTime = matchTime;
    }
  }
}

// Export singleton instance
export const filterService = new FilterService();
