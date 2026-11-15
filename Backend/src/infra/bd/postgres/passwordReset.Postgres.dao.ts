import type { Pool, QueryResultRow } from 'pg';
import { connection } from '../../../util/connection';
import { PasswordResetDAOInterface } from '../../../domain/interfaces/PasswordResetDAOInterface';

export class PasswordResetDAOPostgres implements PasswordResetDAOInterface {
    constructor(private pool: Pool = connection) {}

    async issue(email: string, tokenHash: string): Promise<{ email: string } | null> {
        const db = await this.pool.connect();
        try {
            await db.query('BEGIN');
            // The administrator lock serializes issuing and consuming links.
            const { rows: admins } = await db.query<QueryResultRow>(
                'SELECT id, email, "hashPassword", active FROM administrators WHERE LOWER(email) = LOWER($1) FOR UPDATE', [email]);
            const admin = admins[0];
            if (!admin?.active) {
                await db.query('ROLLBACK');
                return null;
            }
            await db.query(`INSERT INTO password_reset_tokens
                ("adminId", "tokenHash", "passwordHashAtRequest", "emailAtRequest", "createdAt", "expiresAt")
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
                ON CONFLICT ("adminId") DO UPDATE SET "tokenHash" = EXCLUDED."tokenHash",
                    "passwordHashAtRequest" = EXCLUDED."passwordHashAtRequest", "emailAtRequest" = EXCLUDED."emailAtRequest",
                    "createdAt" = EXCLUDED."createdAt", "expiresAt" = EXCLUDED."expiresAt"`,
            [admin.id, tokenHash, admin.hashPassword, admin.email]);
            await db.query('COMMIT');
            return { email: admin.email };
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        } finally {
            db.release();
        }
    }

    async discard(tokenHash: string): Promise<void> {
        await this.pool.query('DELETE FROM password_reset_tokens WHERE "tokenHash" = $1', [tokenHash]);
    }

    async consume(tokenHash: string, passwordHash: string): Promise<boolean> {
        const db = await this.pool.connect();
        try {
            await db.query('BEGIN');
            const { rows: candidates } = await db.query<QueryResultRow>(
                'SELECT "adminId" FROM password_reset_tokens WHERE "tokenHash" = $1', [tokenHash]);
            if (!candidates[0]) {
                await db.query('ROLLBACK');
                return false;
            }
            const adminId = candidates[0].adminId;
            const { rows: admins } = await db.query<QueryResultRow>(
                'SELECT email, "hashPassword", active FROM administrators WHERE id = $1 FOR UPDATE', [adminId]);
            // Locking read observes a concurrently consumed/replaced token, even under REPEATABLE READ.
            const { rows: tokens } = await db.query<QueryResultRow>(`SELECT "passwordHashAtRequest", "emailAtRequest"
                FROM password_reset_tokens WHERE "adminId" = $1 AND "tokenHash" = $2
                AND "expiresAt" > CURRENT_TIMESTAMP FOR UPDATE`, [adminId, tokenHash]);
            const admin = admins[0];
            const token = tokens[0];
            if (!admin?.active || !token || token.passwordHashAtRequest !== admin.hashPassword
                || token.emailAtRequest !== admin.email) {
                await db.query('ROLLBACK');
                return false;
            }
            await db.query('UPDATE administrators SET "hashPassword" = $1 WHERE id = $2', [passwordHash, adminId]);
            await db.query('DELETE FROM password_reset_tokens WHERE "adminId" = $1', [adminId]);
            await db.query('DELETE FROM refresh_tokens WHERE "adminId" = $1', [adminId]);
            await db.query('COMMIT');
            return true;
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        } finally {
            db.release();
        }
    }
}
