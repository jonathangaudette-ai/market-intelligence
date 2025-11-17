/**
 * Prompt Cache System
 *
 * LRU cache for prompt templates to reduce database queries
 * Can be migrated to Redis in the future for distributed caching
 */

import type { PromptTemplate } from '@/types/prompts';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

export class PromptCache {
  private cache: Map<string, CacheEntry<PromptTemplate>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options?: { maxSize?: number; ttlMs?: number }) {
    this.cache = new Map();
    this.maxSize = options?.maxSize || 500; // Store up to 500 prompts
    this.ttlMs = options?.ttlMs || 1000 * 60 * 60; // 1 hour default TTL
  }

  /**
   * Get a prompt from cache
   */
  get(companyId: string, promptKey: string): PromptTemplate | null {
    const cacheKey = this.getCacheKey(companyId, promptKey);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access count (for LRU tracking)
    entry.accessCount++;

    return entry.value;
  }

  /**
   * Store a prompt in cache
   */
  set(companyId: string, promptKey: string, template: PromptTemplate): void {
    const cacheKey = this.getCacheKey(companyId, promptKey);

    // Check if we need to evict oldest entries
    if (this.cache.size >= this.maxSize && !this.cache.has(cacheKey)) {
      this.evictLRU();
    }

    // Store entry
    this.cache.set(cacheKey, {
      value: template,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Invalidate a specific prompt
   */
  invalidate(companyId: string, promptKey: string): void {
    const cacheKey = this.getCacheKey(companyId, promptKey);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all prompts for a company
   */
  invalidateCompany(companyId: string): void {
    const prefix = `${companyId}:`;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; accessCount: number }>;
  } {
    const entries: Array<{ key: string; age: number; accessCount: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: now - entry.timestamp,
        accessCount: entry.accessCount,
      });
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      entries: entries.sort((a, b) => b.accessCount - a.accessCount),
    };
  }

  /**
   * Evict least recently used (LRU) entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccessCount = Infinity;
    let lruTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Evict based on access count first, then age
      if (
        entry.accessCount < lruAccessCount ||
        (entry.accessCount === lruAccessCount && entry.timestamp < lruTimestamp)
      ) {
        lruKey = key;
        lruAccessCount = entry.accessCount;
        lruTimestamp = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(companyId: string, promptKey: string): string {
    return `${companyId}:${promptKey}`;
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;

    let totalAccesses = 0;
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
    }

    // Hit rate estimation based on access patterns
    // This is a simplified calculation - in production you'd track hits/misses
    const avgAccessCount = totalAccesses / this.cache.size;
    return Math.min(avgAccessCount / 10, 1); // Normalize to 0-1
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.ttlMs) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    return keysToDelete.length;
  }
}

// Global singleton instance
let _promptCache: PromptCache | null = null;

/**
 * Get the global prompt cache instance
 */
export function getPromptCache(): PromptCache {
  if (!_promptCache) {
    _promptCache = new PromptCache({
      maxSize: 500,
      ttlMs: 1000 * 60 * 60, // 1 hour
    });

    // Run cleanup every 10 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const cleaned = _promptCache?.cleanup() || 0;
        if (cleaned > 0) {
          console.log(`[PromptCache] Cleaned up ${cleaned} expired entries`);
        }
      }, 1000 * 60 * 10);
    }
  }

  return _promptCache;
}

/**
 * Reset the global cache (useful for testing)
 */
export function resetPromptCache(): void {
  _promptCache = null;
}
