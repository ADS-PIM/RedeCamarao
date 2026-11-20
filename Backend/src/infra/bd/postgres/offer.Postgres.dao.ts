import { ApplicationError } from '../../../application/errors/ApplicationError';
import { connection } from '../../../util/connection';
import { OfferDAOInterface, OfferUpdateData } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { Offer, OfferStatus } from '../../../domain/model/offer';
import type { propsOffer } from '../../../domain/model/offer';
import type { QueryResultRow } from 'pg';
import { imageStorage } from '../../../service/imageStorage';

const databaseOfferStatuses: Record<OfferStatus, string> = {
    ACTIVE: 'ATIVO', INACTIVE: 'PAUSADO', SOLD_OUT: 'VENDIDO', CANCELLED: 'CANCELADO', EXPIRED: 'EXPIRADO', DRAFT: 'RASCUNHO'
};

const offerColumns = `id, admin_disabled AS "adminDisabled", "userId", title, description, type, size, price, weight,
    max_quantity AS "maximumQuantity", min_quantity AS "minimumQuantity",
    location, start_availability_date AS "startDate",
    end_availability_date AS "endDate",
    CASE WHEN admin_disabled THEN 'INACTIVE' ELSE CASE status ${Object.entries(databaseOfferStatuses)
        .map(([status, stored]) => `WHEN '${stored}' THEN '${status}'`).join(' ')}
    END END AS status, "createdAt", "updatedAt"`;

const coverPhotoColumn = `(SELECT "imageUrl" FROM "offerPhotos" WHERE "offerId" = offers.id ORDER BY id ASC LIMIT 1) AS "coverPhoto"`;

const reconstructOffer = (row: QueryResultRow & propsOffer): Offer => Offer.reconstruct({
    ...row,
    price: Number(row.price),
    weight: Number(row.weight),
    maximumQuantity: Number(row.maximumQuantity),
    minimumQuantity: Number(row.minimumQuantity)
});

export class OfferDAOPostgres implements OfferDAOInterface {
    public async search(): Promise<Offer[]> {
        const { rows } = await connection.query<QueryResultRow & propsOffer>(
            `SELECT ${offerColumns} FROM offers WHERE NOT admin_disabled ORDER BY "createdAt" DESC, id DESC`
        );

        return rows.map(reconstructOffer);
    }

    public async searchActive(): Promise<Offer[]> {
        const { rows } = await connection.query<QueryResultRow & propsOffer>(
            `SELECT ${offerColumns}, ${coverPhotoColumn} FROM offers
            WHERE status = 'ATIVO' AND NOT admin_disabled AND EXISTS (SELECT 1 FROM users u WHERE u.id=offers."userId" AND u.account_status='ACTIVE')
                AND start_availability_date <= CURRENT_DATE
                AND end_availability_date >= CURRENT_DATE
            ORDER BY "createdAt" DESC, id DESC`
        );

        return rows.map(reconstructOffer);
    }

    public async listByUserId(userId: string): Promise<Offer[]> {
        const { rows } = await connection.query<QueryResultRow & propsOffer>(
            `SELECT ${offerColumns}, ${coverPhotoColumn}
            FROM offers WHERE "userId" = $1 ORDER BY "createdAt" DESC, id DESC`,
            [userId]
        );

        return rows.map(reconstructOffer);
    }

    public async searchById(id: string): Promise<Offer | null> {
        const { rows } = await connection.query<QueryResultRow & propsOffer>(
            `SELECT ${offerColumns} FROM offers WHERE id = $1`, [id]
        );
        return rows.length === 0 ? null : reconstructOffer(rows[0]);
    }

    public async update(id: string, userId: string, data: OfferUpdateData): Promise<boolean> {
        const columns: Record<keyof OfferUpdateData, string> = {
            title: 'title', description: 'description', type: 'type', size: 'size',
            price: 'price', weight: 'weight', maximumQuantity: 'max_quantity',
            minimumQuantity: 'min_quantity', location: 'location',
            startDate: 'start_availability_date', endDate: 'end_availability_date', status: 'status'
        };
        const fields: string[] = [];
        const values: (string | number | null)[] = [];
        for (const key of Object.keys(columns) as (keyof OfferUpdateData)[]) {
            const value = data[key];
            if (value === undefined) continue;
            fields.push(`"${columns[key]}" = $${values.length + 1}`);
            values.push(key === 'status' ? databaseOfferStatuses[data.status!] : value);
        }
        if (fields.length === 0) return false;

        // Check ownership and merged ranges again atomically, in case another PATCH ran.
        const result = await connection.query(
            `UPDATE offers SET ${fields.join(', ')} WHERE id = $${values.length + 1} AND "userId" = $${values.length + 2}
                AND NOT (admin_disabled AND $${values.length + 7}::boolean)
                AND COALESCE($${values.length + 3}::numeric, min_quantity) <= COALESCE($${values.length + 4}::numeric, max_quantity)
                AND COALESCE($${values.length + 5}::date, start_availability_date) <= COALESCE($${values.length + 6}::date, end_availability_date)`,
            [...values, id, userId, data.minimumQuantity ?? null, data.maximumQuantity ?? null,
                data.startDate ?? null, data.endDate ?? null, data.status === 'ACTIVE']
        );
        return (result.rowCount ?? 0) > 0;
    }

    public async delete(id: string, userId: string): Promise<boolean> {
        // Capture URLs in the same snapshot before the FK cascades to the photos.
        const result = await connection.query(
            `WITH images AS MATERIALIZED (SELECT "imageUrl" FROM "offerPhotos" WHERE "offerId" = $1),
                deleted AS (DELETE FROM offers WHERE id = $1 AND "userId" = $2 RETURNING id)
             SELECT deleted.id, ARRAY(SELECT "imageUrl" FROM images) AS images FROM deleted`, [id, userId]
        );
        await imageStorage.removeUnused((result.rows ?? []).flatMap(row => row.images ?? []));
        return (result.rowCount ?? 0) > 0;
    }

    public async create(offer: Offer): Promise<void> {
        const result = await connection.query(
            `INSERT INTO offers (
                id, "userId", title, description, type, size, price, weight,
                max_quantity, min_quantity, location,
                start_availability_date, end_availability_date, status, "createdAt"
            ) SELECT $1, owner.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
              FROM (SELECT id FROM users WHERE id=$2 AND account_status='ACTIVE' AND user_type='PRODUCER' FOR SHARE) owner`,
            [
                offer.id, offer.userId, offer.title, offer.description, offer.type, offer.size,
                offer.price, offer.weight, offer.maximumQuantity, offer.minimumQuantity,
                offer.location, offer.startDate.toISOString().slice(0, 10),
                offer.endDate.toISOString().slice(0, 10), 'PAUSADO', offer.createdAt
            ]
        );
        if (!result.rowCount) throw new ApplicationError('FORBIDDEN','A conta não pode publicar ofertas.');
    }
}
