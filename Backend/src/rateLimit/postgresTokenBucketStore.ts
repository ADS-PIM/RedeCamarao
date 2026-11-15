import type { Pool } from 'pg';
import { consumeToken, type BucketPolicy, type BucketResult, type TokenBucketStore } from './tokenBucket';

export class PostgresTokenBucketStore implements TokenBucketStore {
    private nextCleanupAt = 0;

    constructor(private pool: Pool) {}

    async consume(key: string, policy: BucketPolicy): Promise<BucketResult> {
        if (Date.now() >= this.nextCleanupAt) {
            this.nextCleanupAt = Date.now() + 60_000;
            try {
                await this.pool.query(`DELETE FROM rate_limit_buckets WHERE bucket_key IN (
                    SELECT bucket_key FROM rate_limit_buckets
                    WHERE expires_at_ms <= EXTRACT(EPOCH FROM clock_timestamp()) * 1000
                    ORDER BY expires_at_ms LIMIT 500 FOR UPDATE SKIP LOCKED
                )`);
            } catch {
                // A cleanup failure must not reset or bypass an active limit.
            }
        }

        const db = await this.pool.connect();
        try {
            await db.query('BEGIN');
            await db.query(`INSERT INTO rate_limit_buckets (bucket_key, tokens, updated_at_ms, expires_at_ms)
                VALUES ($1, $2, FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000),
                    FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) + $3)
                ON CONFLICT (bucket_key) DO NOTHING`, [key, policy.capacity, policy.refillIntervalMs]);
            const { rows } = await db.query(`SELECT tokens, updated_at_ms,
                FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS now_ms
                FROM rate_limit_buckets WHERE bucket_key = $1 FOR UPDATE`, [key]);
            const row = rows[0];
            const result = consumeToken({ tokens: Number(row.tokens), updatedAt: Number(row.updated_at_ms) },
                policy, Number(row.now_ms));
            await db.query(`UPDATE rate_limit_buckets SET tokens = $1, updated_at_ms = $2, expires_at_ms = $3
                WHERE bucket_key = $4`, [result.tokens, result.updatedAt, result.updatedAt + policy.refillIntervalMs, key]);
            await db.query('COMMIT');
            return result;
        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            db.release();
        }
    }
}
