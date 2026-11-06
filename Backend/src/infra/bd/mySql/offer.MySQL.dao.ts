import { connection } from '../../../util/connection';
import { OfferDAOInterface, OfferUpdateData } from '../../../domain/interfaces/offer/OfferDAOInterface';
import { Offer, OfferStatus } from '../../../domain/model/offer';
import type { propsOffer } from '../../../domain/model/offer';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

const databaseOfferStatuses: Record<OfferStatus, string> = {
    ACTIVE: 'ATIVO', INACTIVE: 'PAUSADO', SOLD_OUT: 'VENDIDO', CANCELLED: 'CANCELADO', EXPIRED: 'EXPIRADO'
};

const offerColumns = `id, userId, title, description, type, size, price, weight,
    max_quantity AS maximumQuantity, min_quantity AS minimumQuantity,
    location, start_availability_date AS startDate,
    end_availability_date AS endDate,
    CASE status ${Object.entries(databaseOfferStatuses)
        .map(([status, stored]) => `WHEN '${stored}' THEN '${status}'`).join(' ')}
    END AS status, createdAt`;

const reconstructOffer = (row: RowDataPacket & propsOffer): Offer => Offer.reconstruct({
    ...row,
    price: Number(row.price),
    weight: Number(row.weight),
    maximumQuantity: Number(row.maximumQuantity),
    minimumQuantity: Number(row.minimumQuantity)
});

export class OfferDAOMySQL implements OfferDAOInterface {
    public async search(): Promise<Offer[]> {
        const [rows] = await connection.query<(RowDataPacket & propsOffer)[]>(
            `SELECT ${offerColumns} FROM offers ORDER BY createdAt DESC, id DESC`
        );

        return rows.map(reconstructOffer);
    }

    public async listByUserId(userId: string): Promise<Offer[]> {
        const [rows] = await connection.query<(RowDataPacket & propsOffer)[]>(
            `SELECT ${offerColumns}
            FROM offers WHERE userId = ? ORDER BY createdAt DESC, id DESC`,
            [userId]
        );

        return rows.map(reconstructOffer);
    }

    public async searchById(id: string): Promise<Offer | null> {
        const [rows] = await connection.query<(RowDataPacket & propsOffer)[]>(
            `SELECT ${offerColumns} FROM offers WHERE id = ?`, [id]
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
            fields.push(`${columns[key]} = ?`);
            values.push(key === 'status' ? databaseOfferStatuses[data.status!] : value);
        }
        if (fields.length === 0) return false;

        // Check ownership and merged ranges again atomically, in case another PATCH ran.
        const [result] = await connection.query<ResultSetHeader>(
            `UPDATE offers SET ${fields.join(', ')} WHERE id = ? AND userId = ?
                AND COALESCE(?, min_quantity) <= COALESCE(?, max_quantity)
                AND COALESCE(?, start_availability_date) <= COALESCE(?, end_availability_date)`,
            [...values, id, userId, data.minimumQuantity ?? null, data.maximumQuantity ?? null,
                data.startDate ?? null, data.endDate ?? null]
        );
        return result.affectedRows > 0;
    }

    public async create(offer: Offer): Promise<void> {
        await connection.query(
            `INSERT INTO offers (
                id, userId, title, description, type, size, price, weight,
                max_quantity, min_quantity, location,
                start_availability_date, end_availability_date, status, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                offer.id, offer.userId, offer.title, offer.description, offer.type, offer.size,
                offer.price, offer.weight, offer.maximumQuantity, offer.minimumQuantity,
                offer.location, offer.startDate.toISOString().slice(0, 10),
                offer.endDate.toISOString().slice(0, 10), 'PAUSADO', offer.createdAt
            ]
        );
    }
}
