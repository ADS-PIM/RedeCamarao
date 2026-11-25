import { createHash } from 'node:crypto';
import type { RefreshTokenRotation } from '../../../domain/interfaces/RefreshTokenDAOInterface';
import { connection } from '../../../util/connection';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Only the immediate predecessor can recover a lost Set-Cookie, for 30 seconds after rotation.
const withinRetryWindow = `"createdAt" > statement_timestamp() - interval '30 seconds'`;
export const matchesRefreshCookie = `("tokenHash" = $1 OR ("previousTokenHash" = $1 AND ${withinRetryWindow}))`;

export async function rotateRefreshToken(table: 'user_refresh_tokens' | 'refresh_tokens', rotation: RefreshTokenRotation) {
    const owner = table === 'user_refresh_tokens' ? '"userId"' : '"adminId"';
    const previousHash = hashToken(rotation.previousToken);
    const activeOwner = `${owner} = $3 AND "revokedAt" IS NULL AND "expiresAt" > statement_timestamp()`;
    const updated = await connection.query(`
        UPDATE ${table}
        SET id = $4, "previousTokenHash" = "tokenHash", "tokenHash" = $5,
            "createdAt" = statement_timestamp(), "expiresAt" = $6
        WHERE id = $2 AND "tokenHash" = $1 AND ${activeOwner}
            AND ("previousTokenHash" IS NULL OR NOT (${withinRetryWindow}))`,
        [previousHash, rotation.previousId, rotation.ownerId, rotation.id, hashToken(rotation.token), rotation.expiresAt]);
    if (updated.rowCount === 1) return { id: rotation.id, expiresAt: rotation.expiresAt };

    // A separate statement sees the winning concurrent UPDATE under PostgreSQL READ COMMITTED.
    const { rows } = await connection.query<{ id: string; expiresAt: Date }>(`
        SELECT id, "expiresAt" FROM ${table}
        WHERE ${activeOwner} AND ((id = $2 AND "tokenHash" = $1)
            OR ("previousTokenHash" = $1 AND ${withinRetryWindow}))`,
        [previousHash, rotation.previousId, rotation.ownerId]);
    return rows[0] ?? null;
}
