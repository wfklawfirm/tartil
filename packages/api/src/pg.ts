import pg from 'pg';
import { withContext, type TransactionalDb } from '@tartil/database';

/** Adapts a node-postgres Pool. Transactions hold ONE dedicated client for their whole life (required for SET LOCAL ROLE / set_config(..., true)).
 *  UNTESTED against a live server in this repo (tests run on PGlite) - verify on the target host with `assertSafeRoles` and the isolation suite. */
export function pgDb(pool: pg.Pool): TransactionalDb {
  const wrap = (c: pg.Pool | pg.PoolClient) => ({
    exec: async (sql: string) => { await c.query(sql); },
    query: async <T = Record<string, unknown>>(sql: string, params?: unknown[]) => ({ rows: (await c.query(sql, params as unknown[])).rows as T[] }),
  });
  return {
    ...wrap(pool),
    transaction: async fn => {
      const c = await pool.connect();
      try { await c.query('BEGIN'); const out = await fn(wrap(c)); await c.query('COMMIT'); return out; }
      catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
      finally { c.release(); }
    },
  };
}

/** Refuses to start if the app path could bypass RLS (owner/superuser/BYPASSRLS), or the service path is missing. */
export async function assertSafeRoles(app: TransactionalDb): Promise<void> {
  const r = await withContext(app, {}, tx => tx.query<{ u: string; bypass: boolean }>(`SELECT current_user u, (rolsuper OR rolbypassrls) bypass FROM pg_roles WHERE rolname = current_user`));
  const row = r.rows[0];
  if (!row || row.u !== 'app_user' || row.bypass) throw new Error('unsafe database role for application path');
  const owned = await withContext(app, {}, tx => tx.query(`SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user`));
  if (owned.rows.length) throw new Error('app_user must not own tables');
}
