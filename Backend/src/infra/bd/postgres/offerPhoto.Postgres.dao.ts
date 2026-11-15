import type { QueryResultRow } from 'pg';
import { OfferPhotoDAOInterface, OfferPhotoUpdateData } from '../../../domain/interfaces/offerPhoto/OfferPhotoDAOInterface';
import { OfferPhoto, propsOfferPhoto } from '../../../domain/model/offerPhoto';
import { connection } from '../../../util/connection';

export class OfferPhotoDAOPostgres implements OfferPhotoDAOInterface {
    public async create(photo: OfferPhoto, userId: string): Promise<boolean> {
        // Verify ownership in the write as well, in case the offer changed after the read.
        const result = await connection.query(
            `INSERT INTO "offerPhotos" (id, "offerId", "imageUrl", description)
            SELECT $1, offers.id, $2, $3 FROM offers WHERE offers.id = $4 AND offers."userId" = $5`,
            [photo.id, photo.imageUrl, photo.description, photo.offerId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    public async searchByOfferId(offerId: string): Promise<OfferPhoto[]> {
        const { rows } = await connection.query<QueryResultRow & propsOfferPhoto>(
            'SELECT id, "offerId", "imageUrl", description FROM "offerPhotos" WHERE "offerId" = $1 ORDER BY id ASC',
            [offerId]
        );
        return rows.map(row => OfferPhoto.reconstruct(row));
    }

    public async searchById(id: string): Promise<OfferPhoto | null> {
        const { rows } = await connection.query<QueryResultRow & propsOfferPhoto>(
            'SELECT id, "offerId", "imageUrl", description FROM "offerPhotos" WHERE id = $1', [id]
        );
        return rows.length === 0 ? null : OfferPhoto.reconstruct(rows[0]);
    }

    public async update(id: string, offerId: string, userId: string, data: OfferPhotoUpdateData): Promise<boolean> {
        const fields: string[] = [];
        const values: string[] = [];
        for (const key of ['imageUrl', 'description'] as const) {
            const value = data[key];
            if (value === undefined) continue;
            fields.push(`"${key}" = $${values.length + 1}`);
            values.push(value);
        }
        if (fields.length === 0) return false;

        const result = await connection.query(
            `UPDATE "offerPhotos" AS photo SET ${fields.join(', ')} FROM offers
            WHERE offers.id = photo."offerId"
                AND photo.id = $${values.length + 1} AND photo."offerId" = $${values.length + 2}
                AND offers."userId" = $${values.length + 3}`,
            [...values, id, offerId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    public async delete(id: string, offerId: string, userId: string): Promise<boolean> {
        const result = await connection.query(
            `DELETE FROM "offerPhotos" AS photo USING offers
            WHERE offers.id = photo."offerId" AND photo.id = $1 AND photo."offerId" = $2 AND offers."userId" = $3`,
            [id, offerId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }
}
