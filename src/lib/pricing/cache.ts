/**
 * Simple in-memory cache for pricing API responses
 * TTL-based expiration (default: 5 minutes)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached value with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds TTL in seconds (default: 300 = 5 minutes)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries matching a pattern
   * @param pattern Substring to match in cache keys
   */
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const pricingCache = new InMemoryCache();

// Auto-cleanup every 10 minutes
if (typeof window === "undefined") {
  // Server-side only
  setInterval(
    () => {
      const cleaned = pricingCache.cleanupExpired();
      if (cleaned > 0) {
        console.log(`[PricingCache] Cleaned up ${cleaned} expired entries`);
      }
    },
    10 * 60 * 1000
  ); // 10 minutes
}

/**
 * Helper: Generate cache key for company stats
 */
export function getStatsCacheKey(companySlug: string): string {
  return `pricing_stats_${companySlug}`;
}

/**
 * Helper: Generate cache key for company history
 */
export function getHistoryCacheKey(
  companySlug: string,
  days: number
): string {
  return `pricing_history_${companySlug}_${days}d`;
}

/**
 * Helper: Generate cache key for product matches
 */
export function getMatchesCacheKey(companySlug: string): string {
  return `pricing_matches_${companySlug}`;
}

/**
 * Invalidate all cache for a company (e.g., after catalog import or scan)
 */
export function invalidateCompanyCache(companySlug: string): void {
  pricingCache.clearPattern(companySlug);
  console.log(`[PricingCache] Invalidated all cache for company: ${companySlug}`);
}
