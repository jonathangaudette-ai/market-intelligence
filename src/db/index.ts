import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to avoid connecting during build time
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const queryClient = postgres(process.env.DATABASE_URL);
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

// Export a Proxy to maintain backwards compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return (getDb() as any)[prop];
  }
});
