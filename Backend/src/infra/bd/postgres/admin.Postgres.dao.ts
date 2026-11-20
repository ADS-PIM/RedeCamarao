import { connection } from '../../../util/connection';
import { Admin } from '../../../domain/model/admin';
import { AdminSearchByIdDTO } from '../../../application/dto/adminDTO/AdminSearchByIdDTO';
import { AdminSearchDTO } from '../../../application/dto/adminDTO/AdminSearchDTO';
import { AdminDAOInterface } from '../../../domain/interfaces/admin/AdminDAOInterface';
import { AdminUpdateData } from '../../../domain/interfaces/admin/AdminDAOInterface';

export class AdminDAOPostgres implements AdminDAOInterface{
    public async register(admin: Admin): Promise<void> {
        try {
            const result = await connection.query(
                'INSERT INTO administrators (id, name, email, "hashPassword", role, active, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [admin.id, admin.name, admin.email.trim().toLowerCase(), admin.password, admin.role, admin.active, admin.createdAt]
            );
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }

    async searchByEmail(email: string): Promise<Admin | null> {
        try {
            const { rows: admin } = await connection.query(
                'SELECT id, name, email, "hashPassword" AS password, role, active, "createdAt", "profilePicture" AS profile_picture FROM administrators WHERE LOWER(BTRIM(email)) = LOWER(BTRIM($1))',
                [email]
            );
            if (admin.length == 0) {
                return null;
            }
            return admin[0];
        } catch (error: any) {
            throw new Error('Error searching admin by email: ' + error.message);
        }
    }

    async searchById(id: string): Promise<Admin | null> {
        try {
            const { rows: admins } = await connection.query(
                'SELECT id, name, email, "hashPassword" AS password, role, active, "createdAt", "profilePicture" AS profile_picture FROM administrators WHERE id = $1',
                [id]
            );
            return admins.length === 0 ? null : admins[0];
        } catch (error: any) {
            throw new Error('Error searching admin by id: ' + error.message);
        }
    }

    async searchPublicById(id: string): Promise<AdminSearchByIdDTO | null> {
        try {
            const { rows: admins } = await connection.query(
                'SELECT id, name, email, role, active, "createdAt", "profilePicture" AS profile_picture FROM administrators WHERE id = $1',
                [id]
            );
            return admins.length === 0 ? null : admins[0];
        } catch (error: any) {
            throw new Error('Error searching admin by id: ' + error.message);
        }
    }

    async searchAll(): Promise<AdminSearchDTO[] | null> {
        try {
            const { rows: admins } = await connection.query(
                'SELECT id, name, email, role, active, "profilePicture" AS profile_picture, "createdAt" FROM administrators ORDER BY "createdAt" DESC'
            );
            return admins.length === 0 ? [] : admins;
        } catch (error: any) {
            throw new Error('Error searching admins: ' + error.message);
        }
    }

    async update(id: string, data: AdminUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: (string | boolean | null)[] = [];

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
        if (data.role !== undefined) {
            fields.push(`role = $${values.length + 1}`);
            values.push(data.role);
        }
        if (data.active !== undefined) {
            fields.push(`active = $${values.length + 1}`);
            values.push(data.active);
        }
        if (data.profile_picture !== undefined) {
            fields.push(`"profilePicture" = $${values.length + 1}`);
            values.push(data.profile_picture);
        }

        if (fields.length === 0) {
            return;
        }

        try {
            await connection.query(
                `UPDATE administrators SET ${fields.join(', ')} WHERE id = $${values.length + 1}`,
                [...values, id]
            );
        } catch (error: any) {
            throw new Error('Error updating admin: ' + error.message);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM administrators WHERE id = $1', [id]);
        } catch (error: any) {
            throw new Error('Error deleting admin: ' + error.message);
        }
    }
}
