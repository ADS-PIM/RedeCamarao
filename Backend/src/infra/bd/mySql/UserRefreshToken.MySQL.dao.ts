import { ConsumableRefreshTokenInterface, RefreshTokenRow } from '../../../domain/interfaces/RefreshTokenDAOInterface';
import { connection } from '../../../util/connection';
import type { RowDataPacket } from 'mysql2';

export class UserRefreshTokenDAOMySQL implements ConsumableRefreshTokenInterface {
    async create(id: string, token: string, userId: string, expiresAt: Date): Promise<void> {
        try {
            await connection.query(
                'INSERT INTO user_refresh_tokens (id, tokenHash, userId, expiresAt) VALUES (?, ?, ?, ?)',
                [id, token, userId, expiresAt]
            );
        } catch (error) {
            console.error('Error creating user refresh token:', error);
            throw new Error('Failed to create user refresh token');
        }
    }

    async findByToken(token: string): Promise<RefreshTokenRow | null> {
        try {
            const [rows] = await connection.query<RowDataPacket[]>(
                'SELECT id, userId FROM user_refresh_tokens WHERE tokenHash = ? AND revokedAt IS NULL AND expiresAt > CURRENT_TIMESTAMP',
                [token]
            );
            if (rows.length === 0) return null;
            return { id: String(rows[0].id), userId: String(rows[0].userId) };
        } catch (error) {
            console.error('Error finding user refresh token:', error);
            throw new Error('Failed to find user refresh token');
        }
    }

    async consume(token: string): Promise<RefreshTokenRow | null> {
        const db = await connection.getConnection();

        try {
            await db.beginTransaction();

            const [rows] = await db.query<RowDataPacket[]>(
                'SELECT id, userId FROM user_refresh_tokens WHERE tokenHash = ? AND revokedAt IS NULL AND expiresAt > CURRENT_TIMESTAMP FOR UPDATE',
                [token]
            );

            if (rows.length === 0) {
                await db.rollback();
                return null;
            }

            await db.query(
                'UPDATE user_refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE id = ?',
                [rows[0].id]
            );

            await db.commit();

            return { id: String(rows[0].id), userId: String(rows[0].userId) };
        } catch (error) {
            await db.rollback();
            console.error('Error consuming user refresh token:', error);
            throw new Error('Failed to consume user refresh token');
        } finally {
            db.release();
        }
    }

    async deleteByToken(token: string): Promise<void> {
        try {
            await connection.query(
                'UPDATE user_refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE tokenHash = ? AND revokedAt IS NULL',
                [token]
            );
        } catch (error) {
            console.error('Error deleting user refresh token:', error);
            throw new Error('Failed to delete user refresh token');
        }
    }

    async deleteByUserId(userId: string): Promise<void> {
        try {
            await connection.query(
                'UPDATE user_refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL',
                [userId]
            );
        } catch (error) {
            console.error('Error deleting refresh tokens for user:', error);
            throw new Error('Failed to delete refresh tokens for user');
        }
    }
}
