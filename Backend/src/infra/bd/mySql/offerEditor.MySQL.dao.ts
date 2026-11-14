import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { RowDataPacket } from 'mysql2';
import { connection } from '../../../util/connection';
import { ApplicationError } from '../../../application/errors/ApplicationError';
import { decodeEditorImage } from '../../../application/dto/offerDTO/OfferEditorDTO';
import type { EditorPhoto, OfferEditorData } from '../../../application/dto/offerDTO/OfferEditorDTO';

export class OfferEditorDAOMySQL {
    async save(id: string, userId: string, data: OfferEditorData, photos: EditorPhoto[], origin: string, creating = false) {
        const db = await connection.getConnection();
        const files: string[] = [];
        try {
            await db.beginTransaction();
            if (creating) {
                const [users] = await db.query<RowDataPacket[]>('SELECT user_type FROM users WHERE id = ? FOR UPDATE', [userId]);
                if (!users.length || users[0].user_type !== 'PRODUCER') throw new ApplicationError('FORBIDDEN', 'Somente produtores podem cadastrar ofertas');
            } else {
                const [owners] = await db.query<RowDataPacket[]>('SELECT userId FROM offers WHERE id = ? FOR UPDATE', [id]);
                if (!owners.length) throw new ApplicationError('OFFER_NOT_FOUND', 'Oferta não encontrada');
                if (owners[0].userId !== userId) throw new ApplicationError('FORBIDDEN', 'Acesso negado');
            }
            const existing: RowDataPacket[] = creating ? [] : (await db.query<RowDataPacket[]>('SELECT id, imageUrl FROM offerPhotos WHERE offerId = ?', [id]))[0];
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
                location, start_availability_date, end_availability_date, status, id, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...fields, id, userId]);
            else await db.query(`UPDATE offers SET title = ?, description = ?, type = ?, size = ?, price = ?, weight = ?,
                min_quantity = ?, max_quantity = ?, location = ?, start_availability_date = ?, end_availability_date = ?, status = ?
                WHERE id = ? AND userId = ?`, [...fields, id, userId]);
            await db.query('DELETE FROM offerPhotos WHERE offerId = ?', [id]);
            // Existing readers order by id. Sorted fresh IDs preserve the chosen cover/order without a schema migration.
            const ids = gallery.map(() => randomUUID()).sort();
            for (let i = 0; i < gallery.length; i++) await db.query('INSERT INTO offerPhotos (id, offerId, imageUrl, description) VALUES (?, ?, ?, ?)', [ids[i], id, gallery[i].imageUrl, gallery[i].description]);
            await db.commit();
            return gallery.map((photo, index) => ({ id: ids[index], offerId: id, ...photo }));
        } catch (error) {
            await db.rollback().catch(() => {});
            await Promise.all(files.map(file => unlink(file).catch(() => {})));
            throw error;
        } finally { db.release(); }
    }
}
