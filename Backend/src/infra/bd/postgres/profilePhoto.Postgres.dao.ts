import type { QueryResultRow } from 'pg';
import { connection } from '../../../util/connection';
import { decodeEditorImage } from '../../../application/dto/offerDTO/OfferEditorDTO';
import { ApplicationError } from '../../../application/errors/ApplicationError';
import { imageStorage } from '../../../service/imageStorage';

export class ProfilePhotoDAOPostgres {
    async save(userId: string, data: string | null): Promise<string | null> {
        const image = data === null ? null : decodeEditorImage(data);
        const db = await connection.connect();
        let createdId: string | null = null;
        let oldUrl: unknown = null;
        let profilePicture: string | null = null;
        try {
            await db.query('BEGIN');
            const { rows: users } = await db.query<QueryResultRow>('SELECT "profilePicture" FROM users WHERE id = $1 FOR UPDATE', [userId]);
            if (!users.length) throw new ApplicationError('USER_NOT_FOUND', 'Usuário não encontrado');
            oldUrl = users[0].profilePicture;
            if (image) {
                const uploaded = await imageStorage.upload(image.buffer, 'profiles');
                createdId = uploaded.publicId;
                profilePicture = uploaded.imageUrl;
            }
            await db.query('UPDATE users SET "profilePicture" = $1 WHERE id = $2', [profilePicture, userId]);
            await db.query('COMMIT');
        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            if (createdId) await imageStorage.removeCreated([createdId]);
            throw error;
        } finally { db.release(); }
        await imageStorage.removeUnused([oldUrl]);
        return profilePicture;
    }
}
