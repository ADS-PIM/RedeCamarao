import { connection } from '../../../util/connection';
import { User } from '../../../domain/model/user';
import type { propsUser } from '../../../domain/model/user';
import { UserDAOInterface, UserUpdateData } from '../../../domain/interfaces/user/UserDAOInterface';
import type { RowDataPacket } from 'mysql2';

export class UserDAOMySQL implements UserDAOInterface {
    public async register(user: User): Promise<void> {
        try {
            await connection.query(
                'INSERT INTO users (id, name, email, hashPassword, user_type, cpf_cnpj, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, user.name, user.email, user.password, user.userType, user.cpf_cnpj, user.createdAt]
            );
        } catch (error: any) {
            throw new Error('Error registering user: ' + error.message);
        }
    }

    async searchByEmail(email: string): Promise<User | null> {
        try {
            const [users] = await connection.query<(RowDataPacket & propsUser)[]>(
                'SELECT id, name, email, hashPassword AS password, user_type AS userType, cpf_cnpj, createdAt FROM users WHERE email = ?',
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
                'SELECT id, name, email, hashPassword AS password, user_type AS userType, cpf_cnpj, createdAt FROM users WHERE id = ?',
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
            throw new Error('Error updating user: ' + error.message);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM users WHERE id = ?', [id]);
        } catch (error: any) {
            throw new Error('Error deleting user: ' + error.message);
        }
    }
}
