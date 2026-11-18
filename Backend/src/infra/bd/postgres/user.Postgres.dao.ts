import { connection } from '../../../util/connection';
import { User, UserType } from '../../../domain/model/user';
import type { propsUser } from '../../../domain/model/user';
import {UserDAOInterface,UserUpdateData} from '../../../domain/interfaces/user/UserDAOInterface';
import type { PublicProducer, PublicProducerDAOInterface } from '../../../domain/interfaces/user/PublicProducerDAOInterface';
import type { QueryResultRow } from 'pg';
import { imageStorage } from '../../../service/imageStorage';


const userColumns = `
    id,
    name,
    email,
    "hashPassword" AS password,
    user_type AS "userType",
    "CPF_CNPJ" AS cpf_cnpj,
    description,
    location,
    phone,
    "businessHours",
    "profilePicture",
    "createdAt"
`;


const publicProducerQuery = `
    SELECT u.id, u.name, u.description, u.location, u.phone, u."businessHours", u."profilePicture",
        COALESCE("activeOffers"."activeOfferCount", 0) AS "activeOfferCount"
    FROM users AS u
    LEFT JOIN (
        SELECT "userId", COUNT(*) AS "activeOfferCount"
        FROM offers
        WHERE status = 'ATIVO'
            AND start_availability_date <= CURRENT_DATE
            AND end_availability_date >= CURRENT_DATE
        GROUP BY "userId"
    ) AS "activeOffers" ON "activeOffers"."userId" = u.id
    WHERE u.user_type = $1
`;

type PublicProducerRow = QueryResultRow & Omit<PublicProducer, 'activeOfferCount'> & {
    activeOfferCount: number | string;
};

const publicProducerFromRow = (row: PublicProducerRow): PublicProducer => ({
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    phone: row.phone,
    businessHours: row.businessHours,
    profilePicture: row.profilePicture ?? null,
    activeOfferCount: Number(row.activeOfferCount)
});

export class UserDAOPostgres implements UserDAOInterface, PublicProducerDAOInterface {

    public async listPublicProducers(): Promise<PublicProducer[]> {
        const { rows } = await connection.query<PublicProducerRow>(
            `${publicProducerQuery} ORDER BY u.name ASC, u.id ASC`,
            [UserType.PRODUCER]
        );
        return rows.map(publicProducerFromRow);
    }

    public async searchPublicProducerById(id: string): Promise<PublicProducer | null> {
        const { rows } = await connection.query<PublicProducerRow>(
            `${publicProducerQuery} AND u.id = $2 LIMIT 1`,
            [UserType.PRODUCER, id]
        );
        return rows.length === 0 ? null : publicProducerFromRow(rows[0]);
    }

    public async register(user: User): Promise<void> {

        await connection.query(
            `INSERT INTO users (
                id,
                name,
                email,
                "hashPassword",
                "CPF_CNPJ",
                user_type,
                location,
                phone,
                "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                user.id,
                user.name,
                user.email,
                user.password,
                user.cpf_cnpj,
                user.userType,
                user.location,
                user.phone,
                user.createdAt
            ]
        );
    }


    public async searchByEmail(email: string): Promise<User | null> {

        const { rows: users } = await connection.query<
            QueryResultRow & propsUser
        >(
            `SELECT ${userColumns}
            FROM users
            WHERE LOWER(email) = LOWER($1)`,
            [email]
        );

        if (users.length === 0) {
            return null;
        }

        return User.reconstruct(users[0]);
    }


    public async searchById(id: string): Promise<User | null> {

        const { rows: users } = await connection.query<
            QueryResultRow & propsUser
        >(
            `SELECT ${userColumns}
            FROM users
            WHERE id = $1`,
            [id]
        );

        if (users.length === 0) {
            return null;
        }

        return User.reconstruct(users[0]);
    }


    public async update(
        id: string,
        data: UserUpdateData
    ): Promise<void> {

        const fields: string[] = [];

        const values: (string | null)[] = [];

        if (data.name !== undefined) {
            fields.push(`name = $${values.length + 1}`);
            values.push(data.name);
        }

        if (data.email !== undefined) {
            fields.push(`email = $${values.length + 1}`);
            values.push(data.email.trim().toLowerCase());
        }

        if (data.password !== undefined) {
            fields.push(`"hashPassword" = $${values.length + 1}`);
            values.push(data.password);
        }

        if (data.description !== undefined) {
            fields.push(`description = $${values.length + 1}`);
            values.push(data.description);
        }

        if (data.location !== undefined) {
            fields.push(`location = $${values.length + 1}`);
            values.push(data.location);
        }

        if (data.phone !== undefined) {
            fields.push(`phone = $${values.length + 1}`);
            values.push(data.phone);
        }

        if (data.businessHours !== undefined) {
            fields.push(`"businessHours" = $${values.length + 1}`);
            values.push(data.businessHours);
        }

        if (fields.length === 0) {
            return;
        }

        await connection.query(
            `UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${values.length + 1}`,
            [...values, id]
        );
    }


    public async delete(id: string): Promise<void> {

        const result = await connection.query(
            `WITH images AS MATERIALIZED (
                SELECT "profilePicture" AS "imageUrl" FROM users WHERE id = $1
                UNION SELECT photo."imageUrl" FROM "offerPhotos" AS photo
                    JOIN offers ON offers.id = photo."offerId" WHERE offers."userId" = $1
             ), deleted AS (DELETE FROM users WHERE id = $1 RETURNING id)
             SELECT ARRAY(SELECT "imageUrl" FROM images) AS images FROM deleted`,
            [id]
        );
        await imageStorage.removeUnused((result.rows ?? []).flatMap(row => row.images ?? []));
    }
}
