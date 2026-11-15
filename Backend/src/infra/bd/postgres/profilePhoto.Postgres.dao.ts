import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { QueryResultRow } from 'pg';
import { connection } from '../../../util/connection';
import { decodeEditorImage } from '../../../application/dto/offerDTO/OfferEditorDTO';
import { ApplicationError } from '../../../application/errors/ApplicationError';

const directory = path.resolve(__dirname, '../../../../uploads/profiles');
function previousFile(url: unknown) {
    if (typeof url !== 'string') return null;
    try {
        const filename = new URL(url).pathname.match(/^\/uploads\/profiles\/([a-f0-9-]{36}\.(?:jpg|png))$/i)?.[1];
        return filename ? path.join(directory, filename) : null;
    } catch { return null; }
}
export class ProfilePhotoDAOPostgres {
    async save(userId: string, data: string | null, origin: string): Promise<string | null> {
        const image = data === null ? null : decodeEditorImage(data);
        const db = await connection.connect();
        let createdFile: string | null = null;
        let oldFile: string | null = null;
        let profilePicture: string | null = null;
        try {
            await db.query('BEGIN');
            const { rows: users } = await db.query<QueryResultRow>('SELECT "profilePicture" FROM users WHERE id = $1 FOR UPDATE', [userId]);
            if (!users.length) throw new ApplicationError('USER_NOT_FOUND', 'Usuário não encontrado');
            oldFile = previousFile(users[0].profilePicture);
            if (image) {
                await mkdir(directory, { recursive: true });
                const filename = `${randomUUID()}.${image.extension}`;
                createdFile = path.join(directory, filename);
                await writeFile(createdFile, image.buffer, { flag: 'wx' });
                profilePicture = `${origin}/uploads/profiles/${filename}`;
            }
            await db.query('UPDATE users SET "profilePicture" = $1 WHERE id = $2', [profilePicture, userId]);
            await db.query('COMMIT');
        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            if (createdFile) await unlink(createdFile).catch(() => {});
            throw error;
        } finally { db.release(); }
        if (oldFile) await unlink(oldFile).catch(() => {});
        return profilePicture;
    }
}
