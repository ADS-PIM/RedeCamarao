import { connection } from '../../../util/connection';
import { User } from '../../../domain/model/user';
import type { propsUser } from '../../../domain/model/user';
import {UserDAOInterface,UserUpdateData} from '../../../domain/interfaces/user/UserDAOInterface';
import type { RowDataPacket } from 'mysql2';


const userColumns = `
    id,
    name,
    email,
    hashPassword AS password,
    user_type AS userType,
    CPF_CNPJ AS cpf_cnpj,
    description,
    location,
    phone,
    businessHours,
    createdAt
`;


export class UserDAOMySQL implements UserDAOInterface {

    public async register(user: User): Promise<void> {

        await connection.query(
            `INSERT INTO users (
                id,
                name,
                email,
                hashPassword,
                CPF_CNPJ,
                user_type,
                description,
                location,
                phone,
                businessHours,
                createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                user.name,
                user.email,
                user.password,
                user.cpf_cnpj,
                user.userType,
                user.description,
                user.location,
                user.phone,
                user.businessHours,
                user.createdAt
            ]
        );
    }


    public async searchByEmail(email: string): Promise<User | null> {

        const [users] = await connection.query<
            (RowDataPacket & propsUser)[]
        >(
            `SELECT ${userColumns}
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return null;
        }

        return User.reconstruct(users[0]);
    }


    public async searchById(id: string): Promise<User | null> {

        const [users] = await connection.query<
            (RowDataPacket & propsUser)[]
        >(
            `SELECT ${userColumns}
             FROM users
             WHERE id = ?`,
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
            fields.push('name = ?');
            values.push(data.name);
        }

        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email.trim().toLowerCase());
        }

        if (data.password !== undefined) {
            fields.push('hashPassword = ?');
            values.push(data.password);
        }

        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }

        if (data.location !== undefined) {
            fields.push('location = ?');
            values.push(data.location);
        }

        if (data.phone !== undefined) {
            fields.push('phone = ?');
            values.push(data.phone);
        }

        if (data.businessHours !== undefined) {
            fields.push('businessHours = ?');
            values.push(data.businessHours);
        }

        if (fields.length === 0) {
            return;
        }

        await connection.query(
            `UPDATE users
             SET ${fields.join(', ')}
             WHERE id = ?`,
            [...values, id]
        );
    }


    public async delete(id: string): Promise<void> {

        await connection.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );
    }
}