import { connection } from '../../../util/connection';
import { User, UserType } from '../../../domain/model/user';
import type { propsUser } from '../../../domain/model/user';
import { UserDAOInterface, UserUpdateData } from '../../../domain/interfaces/user/UserDAOInterface';
import type { RowDataPacket } from 'mysql2';

// Keep the HTTP contract in English while the database follows the diagram.
const databaseUserTypes: Record<UserType, string> = {
    [UserType.PRODUCER]: 'PRODUTOR',
    [UserType.BUYER]: 'COMPRADOR'
};
const userColumns = `id, name, email, hashPassword AS password,
    CASE user_type WHEN 'PRODUTOR' THEN 'PRODUCER' WHEN 'COMPRADOR' THEN 'BUYER' END AS userType,
    CPF_CNPJ AS cpf_cnpj, createdAt`;

export class UserDAOMySQL implements UserDAOInterface {
    public async register(user: User): Promise<void> {
        try {
            await connection.query(
                'INSERT INTO users (id, name, email, hashPassword, user_type, CPF_CNPJ, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, user.name, user.email, user.password, databaseUserTypes[user.userType], user.cpf_cnpj, user.createdAt]
            );
        } catch (error: any) {
            throw error;
        }
    }

    async searchByEmail(email: string): Promise<User | null> {
        try {
            const [users] = await connection.query<(RowDataPacket & propsUser)[]>(
                `SELECT ${userColumns} FROM users WHERE email = ?`,
                [email]
            );
            return users.length === 0 ? null : User.reconstruct(users[0]);
        } catch (error: any) {
            throw new Error('Error searching user by email: ' + error.message);
        }
    }

    async searchById(id: string): Promise<User | null> {
        try {
            const [users] = await connection.query<(RowDataPacket & propsUser)[]>(
                `SELECT ${userColumns} FROM users WHERE id = ?`,
                [id]
            );
            return users.length === 0 ? null : User.reconstruct(users[0]);
        } catch (error: any) {
            throw new Error('Error searching user by id: ' + error.message);
        }
    }

    async update(id: string, data: UserUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: string[] = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email);
        }
        if (data.password !== undefined) {
            fields.push('hashPassword = ?');
            values.push(data.password);
        }

        if (fields.length === 0) {
            return;
        }

        try {
            await connection.query(
                `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
        } catch (error: any) {
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM users WHERE id = ?', [id]);
        } catch (error: any) {
            throw error;
        }
    }
}
