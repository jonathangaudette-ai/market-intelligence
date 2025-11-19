/**
 * Rate Limiter - Gestion de la limitation de débit pour éviter le bannissement
 */

import type { CompetitorRateLimiting } from '../types';

export class RateLimiter {
  private lastRequestTime: number = 0;
  private minDelay: number;
  private productDelay: number;

  constructor(config: CompetitorRateLimiting) {
    this.minDelay = config.requestDelay;
    this.productDelay = config.productDelay;
  }

  /**
   * Wait if needed to respect rate limiting
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await this.wait(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Wait for a specific duration
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the minimum delay between requests
   */
  getMinDelay(): number {
    return this.minDelay;
  }

  /**
   * Get the delay between products
   */
  getProductDelay(): number {
    return this.productDelay;
  }

  /**
   * Update rate limiting configuration
   */
  updateConfig(config: CompetitorRateLimiting): void {
    this.minDelay = config.requestDelay;
    this.productDelay = config.productDelay;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.lastRequestTime = 0;
  }
}
