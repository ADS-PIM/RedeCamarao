import { randomUUID } from 'node:crypto';

import { RowDataPacket } from 'mysql2/promise';

import { connection } from '../../../util/connection';

import { UserRefreshTokenDAOInterface } from '../../../domain/interfaces/user/UserRefreshTokenDAOInterface';

export class UserRefreshTokenDAOMySQL implements UserRefreshTokenDAOInterface {

    public async create(
        userId: string,
        tokenHash: string,
        expiresAt: Date
    ): Promise<void> {

        await connection.execute(
            `INSERT INTO user_refresh_tokens
            (id, userId, tokenHash, expiresAt)
            VALUES (?, ?, ?, ?)`,
            [
                randomUUID(),
                userId,
                tokenHash,
                expiresAt
            ]
        );
    }

    public async consume(tokenHash: string): Promise<string | null> {

        const db = await connection.getConnection();

        try {
            await db.beginTransaction();

            const [tokens] = await db.execute<RowDataPacket[]>(
                `SELECT id, userId
                FROM user_refresh_tokens
                WHERE tokenHash = ?
                AND revokedAt IS NULL
                AND expiresAt > CURRENT_TIMESTAMP
                FOR UPDATE`,
                [tokenHash]
            );

            if (tokens.length === 0) {
                await db.rollback();
                return null;
            }

            await db.execute(
                `UPDATE user_refresh_tokens
                SET revokedAt = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [tokens[0].id]
            );

            await db.commit();

            return tokens[0].userId;

        } catch (error) {

            await db.rollback();
            throw error;

        } finally {

            db.release();
        }
    }

    public async revoke(tokenHash: string): Promise<void> {

        await connection.execute(
            `UPDATE user_refresh_tokens
            SET revokedAt = CURRENT_TIMESTAMP
            WHERE tokenHash = ?
            AND revokedAt IS NULL`,
            [tokenHash]
        );
    }

    public async revokeAll(userId: string): Promise<void> {

        await connection.execute(
            `UPDATE user_refresh_tokens
            SET revokedAt = CURRENT_TIMESTAMP
            WHERE userId = ?
            AND revokedAt IS NULL`,
            [userId]
        );
    }
}