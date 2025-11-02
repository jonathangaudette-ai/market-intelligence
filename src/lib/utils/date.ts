/**
 * Date utilities for the application
 * Provides current date context for AI analysis
 */

export interface DateContext {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  timestamp: number;
  formatted: string; // Human-readable format
  iso: string; // ISO 8601 format
}

/**
 * Get current date context for AI prompts
 * Always uses system time to ensure accuracy
 */
export function getCurrentDateContext(): DateContext {
  const now = new Date();

  // Format: 2025-11-02
  const date = now.toISOString().split('T')[0];

  // Format: 14:30:45
  const time = now.toTimeString().split(' ')[0];

  // Human-readable: "2 novembre 2025"
  const formatted = now.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return {
    date,
    time,
    timestamp: now.getTime(),
    formatted,
    iso: now.toISOString(),
  };
}

/**
 * Format date context for inclusion in AI prompts
 */
export function getDateContextString(): string {
  const ctx = getCurrentDateContext();
  return `Date actuelle: ${ctx.formatted} (${ctx.date})`;
}

/**
 * Get current year for dynamic copyright, etc.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}
