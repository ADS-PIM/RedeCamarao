import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { QueryResultRow } from 'pg';
import { connection } from '../../../util/connection';
import { ApplicationError } from '../../../application/errors/ApplicationError';
import { decodeEditorImage } from '../../../application/dto/offerDTO/OfferEditorDTO';
import type { EditorPhoto, OfferEditorData } from '../../../application/dto/offerDTO/OfferEditorDTO';

export class OfferEditorDAOPostgres {
    async save(id: string, userId: string, data: OfferEditorData, photos: EditorPhoto[], origin: string, creating = false) {
        const db = await connection.connect();
        const files: string[] = [];
        try {
            await db.query('BEGIN');
            if (creating) {
                const { rows: users } = await db.query<QueryResultRow>('SELECT user_type FROM users WHERE id = $1 FOR UPDATE', [userId]);
                if (!users.length || users[0].user_type !== 'PRODUCER') throw new ApplicationError('FORBIDDEN', 'Somente produtores podem cadastrar ofertas');
            } else {
                const { rows: owners } = await db.query<QueryResultRow>('SELECT "userId" FROM offers WHERE id = $1 FOR UPDATE', [id]);
                if (!owners.length) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
                if (owners[0].userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');
            }
            const existing: QueryResultRow[] = creating ? [] : (await db.query<QueryResultRow>('SELECT id, "imageUrl" FROM "offerPhotos" WHERE "offerId" = $1', [id])).rows;
            for (const photo of photos) {
                if (photo.id && !existing.some(row => row.id === photo.id)) throw new ApplicationError('INVALID_DATA', 'Uma das fotos não pertence a esta oferta. Recarregue a página.');
            }
            const gallery: { imageUrl: string; description: string }[] = [];
            for (const photo of photos) {
                if (photo.id) gallery.push({ imageUrl: existing.find(row => row.id === photo.id)!.imageUrl, description: photo.description });
                else {
                    const { buffer, extension } = decodeEditorImage(photo.data!);
                    const directory = path.resolve(__dirname, '../../../../uploads/offers');
                    await mkdir(directory, { recursive: true });
                    const filename = `${randomUUID()}.${extension}`;
                    const target = path.join(directory, filename);
                    files.push(target);
                    await writeFile(target, buffer, { flag: 'wx' });
                    gallery.push({ imageUrl: `${origin}/uploads/offers/${filename}`, description: photo.description });
                }
            }
            const fields = [data.title, data.description, data.type, data.size, data.price, data.weight,
                data.minimumQuantity, data.maximumQuantity, data.location, data.startDate, data.endDate,
                data.status === 'ACTIVE' ? 'ATIVO' : data.status === 'DRAFT' ? 'RASCUNHO' : 'PAUSADO'];
            if (creating) await db.query(`INSERT INTO offers (title, description, type, size, price, weight, min_quantity, max_quantity,
                location, start_availability_date, end_availability_date, status, id, "userId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [...fields, id, userId]);
            else await db.query(`UPDATE offers SET title = $1, description = $2, type = $3, size = $4, price = $5, weight = $6,
                min_quantity = $7, max_quantity = $8, location = $9, start_availability_date = $10, end_availability_date = $11, status = $12
                WHERE id = $13 AND "userId" = $14`, [...fields, id, userId]);
            await db.query('DELETE FROM "offerPhotos" WHERE "offerId" = $1', [id]);
            // Existing readers order by id. Sorted fresh IDs preserve the chosen cover/order without a schema migration.
            const ids = gallery.map(() => randomUUID()).sort();
            for (let i = 0; i < gallery.length; i++) await db.query('INSERT INTO "offerPhotos" (id, "offerId", "imageUrl", description) VALUES ($1, $2, $3, $4)', [ids[i], id, gallery[i].imageUrl, gallery[i].description]);
            await db.query('COMMIT');
            return gallery.map((photo, index) => ({ id: ids[index], offerId: id, ...photo }));
        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            await Promise.all(files.map(file => unlink(file).catch(() => {})));
            throw error;
        } finally { db.release(); }
    }
}
