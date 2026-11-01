import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface Executor {
  exec(sql: string): Promise<unknown>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** Applies migrations in filename order inside one transaction each. Refuses to run if an applied migration's checksum changed. */
export async function applyMigrations(db: Executor): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Map((await db.query<{ version: string; checksum: string }>('SELECT version, checksum FROM schema_migrations')).rows.map(r => [r.version, r.checksum]));
  const done: string[] = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prev = applied.get(file);
    if (prev) {
      if (prev !== checksum) throw new Error(`Migration ${file} was modified after being applied (checksum mismatch). Create a new migration instead.`);
      continue;
    }
    await db.exec('BEGIN');
    try {
      await db.exec(sql);
      await db.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
    done.push(file);
  }
  return done;
}
