/**
 * Prompt Metrics Tracking
 *
 * Track performance and usage of prompts for:
 * - Performance monitoring
 * - Cost analysis
 * - A/B testing
 * - Debugging
 */

import type { PromptKey, PromptMetrics } from '@/types/prompts';

/**
 * In-memory metrics storage
 * TODO: Persist to database or send to analytics service (PostHog, Mixpanel, etc.)
 */
class MetricsCollector {
  private metrics: PromptMetrics[] = [];
  private maxSize: number = 10000; // Keep last 10k metrics

  /**
   * Record a prompt execution
   */
  record(metric: PromptMetrics): void {
    this.metrics.push(metric);

    // Trim if exceeds max size
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const status = metric.success ? '✅' : '❌';
      console.log(
        `[PromptMetrics] ${status} ${metric.promptKey} - ${metric.executionTimeMs}ms (${metric.tokensUsed} tokens)`
      );
    }
  }

  /**
   * Get metrics for a specific prompt
   */
  getMetrics(
    promptKey: PromptKey,
    options?: {
      companyId?: string;
      since?: Date;
      limit?: number;
    }
  ): PromptMetrics[] {
    let filtered = this.metrics.filter((m) => m.promptKey === promptKey);

    if (options?.companyId) {
      filtered = filtered.filter((m) => m.companyId === options.companyId);
    }

    if (options?.since) {
      filtered = filtered.filter((m) => m.timestamp >= options.since!);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get aggregate statistics for a prompt
   */
  getStats(
    promptKey: PromptKey,
    options?: {
      companyId?: string;
      since?: Date;
    }
  ): {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    medianExecutionTime: number;
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    totalTokensUsed: number;
    avgTokensPerExecution: number;
    errorRate: number;
    mostCommonErrors: Array<{ errorType: string; count: number }>;
  } {
    const metrics = this.getMetrics(promptKey, options);

    if (metrics.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        medianExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        totalTokensUsed: 0,
        avgTokensPerExecution: 0,
        errorRate: 0,
        mostCommonErrors: [],
      };
    }

    // Success rate
    const successCount = metrics.filter((m) => m.success).length;
    const successRate = successCount / metrics.length;

    // Execution times
    const executionTimes = metrics.map((m) => m.executionTimeMs).sort((a, b) => a - b);
    const avgExecutionTime =
      executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length;
    const medianExecutionTime = executionTimes[Math.floor(executionTimes.length / 2)];
    const p95ExecutionTime = executionTimes[Math.floor(executionTimes.length * 0.95)];
    const p99ExecutionTime = executionTimes[Math.floor(executionTimes.length * 0.99)];

    // Tokens
    const totalTokensUsed = metrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const avgTokensPerExecution = totalTokensUsed / metrics.length;

    // Errors
    const errorRate = 1 - successRate;
    const errorCounts = new Map<string, number>();
    metrics
      .filter((m) => !m.success && m.errorType)
      .forEach((m) => {
        const count = errorCounts.get(m.errorType!) || 0;
        errorCounts.set(m.errorType!, count + 1);
      });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalExecutions: metrics.length,
      successRate,
      avgExecutionTime,
      medianExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      totalTokensUsed,
      avgTokensPerExecution,
      errorRate,
      mostCommonErrors,
    };
  }

  /**
   * Compare two prompts (for A/B testing)
   */
  compare(
    promptKeyA: PromptKey,
    promptKeyB: PromptKey,
    options?: {
      companyId?: string;
      since?: Date;
    }
  ): {
    promptA: ReturnType<MetricsCollector['getStats']>;
    promptB: ReturnType<MetricsCollector['getStats']>;
    comparison: {
      performanceDiff: number; // % difference in execution time
      successRateDiff: number; // % difference in success rate
      tokenUsageDiff: number; // % difference in token usage
      recommendation: 'A' | 'B' | 'similar';
    };
  } {
    const statsA = this.getStats(promptKeyA, options);
    const statsB = this.getStats(promptKeyB, options);

    const performanceDiff =
      ((statsB.avgExecutionTime - statsA.avgExecutionTime) / statsA.avgExecutionTime) * 100;
    const successRateDiff = ((statsB.successRate - statsA.successRate) / statsA.successRate) * 100;
    const tokenUsageDiff =
      ((statsB.avgTokensPerExecution - statsA.avgTokensPerExecution) /
        statsA.avgTokensPerExecution) *
      100;

    // Simple recommendation logic
    let recommendation: 'A' | 'B' | 'similar' = 'similar';

    if (Math.abs(successRateDiff) > 5 || Math.abs(performanceDiff) > 20) {
      if (statsA.successRate > statsB.successRate || statsA.avgExecutionTime < statsB.avgExecutionTime) {
        recommendation = 'A';
      } else {
        recommendation = 'B';
      }
    }

    return {
      promptA: statsA,
      promptB: statsB,
      comparison: {
        performanceDiff,
        successRateDiff,
        tokenUsageDiff,
        recommendation,
      },
    };
  }

  /**
   * Get all metrics (for export/debugging)
   */
  getAllMetrics(): PromptMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get summary across all prompts
   */
  getSummary(): {
    totalPrompts: number;
    totalExecutions: number;
    overallSuccessRate: number;
    totalTokensUsed: number;
    mostUsedPrompts: Array<{ promptKey: PromptKey; count: number }>;
    slowestPrompts: Array<{ promptKey: PromptKey; avgTime: number }>;
  } {
    const promptCounts = new Map<PromptKey, number>();
    const promptTimes = new Map<PromptKey, number[]>();
    let totalSuccesses = 0;
    let totalTokensUsed = 0;

    for (const metric of this.metrics) {
      // Count executions
      promptCounts.set(metric.promptKey, (promptCounts.get(metric.promptKey) || 0) + 1);

      // Track times
      if (!promptTimes.has(metric.promptKey)) {
        promptTimes.set(metric.promptKey, []);
      }
      promptTimes.get(metric.promptKey)!.push(metric.executionTimeMs);

      // Aggregate stats
      if (metric.success) totalSuccesses++;
      totalTokensUsed += metric.tokensUsed;
    }

    const mostUsedPrompts = Array.from(promptCounts.entries())
      .map(([promptKey, count]) => ({ promptKey, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const slowestPrompts = Array.from(promptTimes.entries())
      .map(([promptKey, times]) => ({
        promptKey,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    return {
      totalPrompts: promptCounts.size,
      totalExecutions: this.metrics.length,
      overallSuccessRate: this.metrics.length > 0 ? totalSuccesses / this.metrics.length : 0,
      totalTokensUsed,
      mostUsedPrompts,
      slowestPrompts,
    };
  }
}

// Global singleton
let _metricsCollector: MetricsCollector | null = null;

/**
 * Get the global metrics collector
 */
export function getMetricsCollector(): MetricsCollector {
  if (!_metricsCollector) {
    _metricsCollector = new MetricsCollector();
  }
  return _metricsCollector;
}

/**
 * Record a prompt execution metric
 */
export function recordMetric(metric: PromptMetrics): void {
  getMetricsCollector().record(metric);
}

/**
 * Get stats for a prompt
 */
export function getPromptStats(
  promptKey: PromptKey,
  options?: {
    companyId?: string;
    since?: Date;
  }
): ReturnType<MetricsCollector['getStats']> {
  return getMetricsCollector().getStats(promptKey, options);
}

/**
 * Compare two prompts (A/B testing)
 */
export function comparePrompts(
  promptKeyA: PromptKey,
  promptKeyB: PromptKey,
  options?: {
    companyId?: string;
    since?: Date;
  }
): ReturnType<MetricsCollector['compare']> {
  return getMetricsCollector().compare(promptKeyA, promptKeyB, options);
}

/**
 * Get summary across all prompts
 */
export function getMetricsSummary(): ReturnType<MetricsCollector['getSummary']> {
  return getMetricsCollector().getSummary();
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  _metricsCollector = null;
}
