/**
 * Vitest Setup File
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.PINECONE_API_KEY = 'test-pinecone-key';
  process.env.PINECONE_ENVIRONMENT = 'test';
  process.env.PINECONE_INDEX_NAME = 'test-index';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3010';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  // Cleanup resources
});
