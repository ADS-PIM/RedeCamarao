import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { OfferPhotoDAOInterface, OfferPhotoUpdateData } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { OfferPhoto, propsOfferPhoto } from '../../../domain/model/offerPhoto';
import { connection } from '../../../util/connection';

export class OfferPhotoDAOMySQL implements OfferPhotoDAOInterface {
    public async create(photo: OfferPhoto, userId: string): Promise<boolean> {
        // Verify ownership in the write as well, in case the offer changed after the read.
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO offerPhotos (id, offerId, imageUrl, description)
            SELECT ?, offers.id, ?, ? FROM offers WHERE offers.id = ? AND offers.userId = ?`,
            [photo.id, photo.imageUrl, photo.description, photo.offerId, userId]
        );
        return result.affectedRows > 0;
    }

    public async searchByOfferId(offerId: string): Promise<OfferPhoto[]> {
        const [rows] = await connection.query<(RowDataPacket & propsOfferPhoto)[]>(
            'SELECT id, offerId, imageUrl, description FROM offerPhotos WHERE offerId = ? ORDER BY id ASC',
            [offerId]
        );
        return rows.map(row => OfferPhoto.reconstruct(row));
    }

    public async searchById(id: string): Promise<OfferPhoto | null> {
        const [rows] = await connection.query<(RowDataPacket & propsOfferPhoto)[]>(
            'SELECT id, offerId, imageUrl, description FROM offerPhotos WHERE id = ?', [id]
        );
        return rows.length === 0 ? null : OfferPhoto.reconstruct(rows[0]);
    }

    public async update(id: string, offerId: string, userId: string, data: OfferPhotoUpdateData): Promise<boolean> {
        const fields: string[] = [];
        const values: string[] = [];
        for (const key of ['imageUrl', 'description'] as const) {
            const value = data[key];
            if (value === undefined) continue;
            fields.push(`photo.${key} = ?`);
            values.push(value);
        }
        if (fields.length === 0) return false;

        const [result] = await connection.query<ResultSetHeader>(
            `UPDATE offerPhotos AS photo INNER JOIN offers ON offers.id = photo.offerId
            SET ${fields.join(', ')}
            WHERE photo.id = ? AND photo.offerId = ? AND offers.userId = ?`,
            [...values, id, offerId, userId]
        );
        return result.affectedRows > 0;
    }

    public async delete(id: string, offerId: string, userId: string): Promise<boolean> {
        const [result] = await connection.query<ResultSetHeader>(
            `DELETE photo FROM offerPhotos AS photo INNER JOIN offers ON offers.id = photo.offerId
            WHERE photo.id = ? AND photo.offerId = ? AND offers.userId = ?`,
            [id, offerId, userId]
        );
        return result.affectedRows > 0;
    }
}
