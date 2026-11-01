import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { buildApp } from './app.ts';
import { pgDb, assertSafeRoles } from './pg.ts';

const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`missing env ${k}`); return v; };
const secret = need('JWT_SECRET');
if (secret.length < 32) throw new Error('JWT_SECRET must be >= 32 chars');
const service = pgDb(new pg.Pool({ connectionString: need('SERVICE_DATABASE_URL'), max: 4 }));   // registration/login/bootstrap only
const app = pgDb(new pg.Pool({ connectionString: need('APP_DATABASE_URL'), max: 10 }));          // used only via withContext (SET LOCAL ROLE app_user)
await assertSafeRoles(app);
const server = buildApp({ service, app, jwtSecret: secret, webIndexPath: fileURLToPath(new URL('../../web/index.html', import.meta.url)) });
await server.listen({ port: Number(process.env.PORT ?? 8080), host: '0.0.0.0' });
