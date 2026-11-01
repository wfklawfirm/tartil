export interface TxLike {
  exec(sql: string): Promise<unknown>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export interface TransactionalDb extends TxLike {
  transaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T>;
}
export interface RequestContext { userId?: string; institutionId?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `fn` in a transaction as the unprivileged `app_user` role with transaction-local identity.
 * This is the ONLY way application code should touch tenant data. Values are validated and bound as parameters.
 * Everything (role, settings) is rolled back at transaction end, so pooled connections cannot leak identity.
 */
export async function withContext<T>(db: TransactionalDb, ctx: RequestContext, fn: (tx: TxLike) => Promise<T>): Promise<T> {
  for (const [k, v] of Object.entries(ctx)) if (v !== undefined && !UUID.test(v)) throw new Error(`invalid ${k}`);
  return db.transaction(async tx => {
    await tx.exec('SET LOCAL ROLE app_user');
    await tx.query(`SELECT set_config('app.user_id', $1, true), set_config('app.institution_id', $2, true)`, [ctx.userId ?? '', ctx.institutionId ?? '']);
    return fn(tx);
  });
}
