import { ApplicationError } from '../../../application/errors/ApplicationError';
import { connection } from '../../../util/connection';
import { OfferDAOInterface, OfferUpdateData, MarketplaceList, MarketplaceRegion } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { publicOfferCondition } from './offerPopularity';
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

    public async searchActive(list: MarketplaceList = 'recent', region?: MarketplaceRegion): Promise<Offer[]> {
        const popularityOrder = list === 'recent' ? '' : `
            (SELECT COUNT(*) FROM offer_contacts WHERE offer_id = offers.id) DESC,
            COALESCE((SELECT views FROM offer_views WHERE offer_id = offers.id), 0) DESC,`;
        if (list === 'showcase') {
            const { rows } = await connection.query<QueryResultRow & propsOffer>(`
                WITH eligible AS (
                    SELECT id, weight, "createdAt",
                        ("createdAt" BETWEEN now() - interval '24 hours' AND now()
                            AND ($1::text IS NULL OR trim(location) ~* ('(^|[[:space:],/–-])' || $1 || '$')
                                OR translate(lower(trim(regexp_replace(location, '^.*[,/–-]', ''))),'áâãéêíóôõúç','aaaeeiooouc')
                                 = translate(lower($2),'áâãéêíóôõúç','aaaeeiooouc'))) AS fresh
                    FROM offers WHERE ${publicOfferCondition}
                ), featured AS (
                    SELECT id FROM eligible offers ORDER BY ${popularityOrder} "createdAt" DESC, id DESC LIMIT 4
                ), wholesale AS (
                    SELECT id FROM eligible WHERE weight > 500 AND id NOT IN (SELECT id FROM featured)
                    ORDER BY fresh, weight DESC, "createdAt" DESC, id DESC LIMIT 4
                ), regional AS (
                    SELECT id FROM eligible WHERE fresh AND id NOT IN (SELECT id FROM featured UNION ALL SELECT id FROM wholesale)
                    ORDER BY "createdAt" DESC, id DESC LIMIT 4
                ), picks AS (
                    SELECT id, 'featured' AS shelf FROM featured UNION ALL
                    SELECT id, 'wholesale' FROM wholesale UNION ALL SELECT id, 'regional' FROM regional
                )
                SELECT ${offerColumns}, ${coverPhotoColumn}, shelf
                FROM offers JOIN picks USING (id)
                ORDER BY CASE WHEN shelf='featured' THEN (SELECT count(*) FROM offer_contacts WHERE offer_id=offers.id) END DESC,
                    CASE WHEN shelf='featured' THEN COALESCE((SELECT views FROM offer_views WHERE offer_id=offers.id), 0) END DESC,
                    CASE WHEN shelf='wholesale' THEN weight END DESC, "createdAt" DESC, id DESC`,
                [region?.code ?? null, region?.name ?? null]);
            return rows.map(reconstructOffer);
        }
        const { rows } = await connection.query<QueryResultRow & propsOffer>(
            `SELECT ${offerColumns}, ${coverPhotoColumn} FROM offers
            WHERE ${publicOfferCondition}
            ORDER BY ${popularityOrder} "createdAt" DESC, id DESC
            ${list === 'featured' ? 'LIMIT 4' : ''}`
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
