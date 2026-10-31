import { RowDataPacket } from 'mysql2';
import { connection } from '../../../util/connection';
import { User, UserType } from '../../../domain/model/user';
import { UserDAOInterface, UserUpdateData} from '../../../domain/interfaces/user/UserDAOInterface';


export class UserDAOMySQL implements UserDAOInterface {
    public async register(user: User): Promise<void> {
        try {
            await connection.execute(
                'INSERT INTO users (id, name, email, hashPassword, user_type, cpf_cnpj, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    user.id,
                    user.name,
                    user.email,
                    user.password,
                    user.userType,
                    user.cpf_cnpj,
                    user.createdAt
                ]
            );
        } catch (error: any) {
            throw new Error('Error registering user: ' + error.message);
        }
    }

    public async searchByEmail(email: string): Promise<User | null> {
        try {
        const [users] = await connection.execute<RowDataPacket[]>(
            'SELECT id, name, email, hashPassword, user_type, cpf_cnpj, createdAt FROM users WHERE email = ?', [email]
        );

        if (users.length === 0) {
            return null;
        }
        return User.reconstruct({
            id: users[0].id,
            name: users[0].name,
            email: users[0].email,
            password: users[0].hashPassword,
            userType: users[0].user_type as UserType,
            cpf_cnpj: users[0].cpf_cnpj,
            createdAt: users[0].createdAt
        });
    } catch (error: any) {
        throw new Error('Error searching user by email: ' + error.message);
    }
        
    }

    public async searchById(id: string): Promise<User | null> {
        try {
            const [users] = await connection.execute<RowDataPacket[]>(
                'SELECT id, name, email, hashPassword, user_type, cpf_cnpj, createdAt FROM users WHERE id = ?', [id]
            );
            if (users.length === 0) {
                return null;
            }
            return User.reconstruct({
                id: users[0].id,
                name: users[0].name,
                email: users[0].email,
                password: users[0].hashPassword,
                userType: users[0].user_type as UserType,
                cpf_cnpj: users[0].cpf_cnpj,
                createdAt: users[0].createdAt
            });
        } catch (error: any) {
            throw new Error('Error searching user by ID: ' + error.message);
        }
    }

    public async update(id: string, data: UserUpdateData): Promise<void> {
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
            fields.push('password = ?');
            values.push(data.password);
        }

        if (fields.length === 0) {
            return
        }
        values.push(id);

        await connection.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        )
    }

    public async delete(id: string): Promise<void> {
        try {
            await connection.execute(
                'DELETE FROM users WHERE id = ?',
                [id]
            );
        } catch (error: any) {
            throw new Error('Error deleting user: ' + error.message);
        }
    }
}