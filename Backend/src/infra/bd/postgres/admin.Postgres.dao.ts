import { connection } from '../../../util/connection';
import { Admin } from '../../../domain/model/admin';
import { AdminSearchByIdDTO } from '../../../application/dto/adminDTO/AdminSearchByIdDTO';
import { AdminSearchDTO } from '../../../application/dto/adminDTO/AdminSearchDTO';
import { AdminDAOInterface } from '../../../domain/interfaces/admin/AdminDAOInterface';
import type { PoolClient } from 'pg';
import { ModerationError, transaction } from '../../../service/moderation';
import { AdminAudit, AdminUpdateData } from '../../../domain/interfaces/admin/AdminDAOInterface';

async function lockMembers(db: PoolClient, actorId: string, targetId: string) {
    const { rows } = await db.query('SELECT id,name,role,active FROM administrators WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [[actorId,targetId]]);
    const actor = rows.find(member => member.id === actorId);
    const target = rows.find(member => member.id === targetId);
    if (!actor?.active || (actorId !== targetId && actor.role !== 'SUPER_ADMIN')) throw new ModerationError(403, 'Permissão insuficiente.');
    if (!target) throw new ModerationError(404, 'Membro não encontrado.');
    return { actor, target };
}

export class AdminDAOPostgres implements AdminDAOInterface{
    public async register(admin: Admin, audit?: { actorId: string; justification: string }): Promise<void> {
        try {
            if (audit) {
                const result = await connection.query(`WITH actor AS (
                    SELECT id,name FROM administrators WHERE id=$7 AND active AND role='SUPER_ADMIN' FOR SHARE
                ), member AS (
                    INSERT INTO administrators (id,name,email,"hashPassword",role) SELECT $1,$2,$3,$4,$5 FROM actor RETURNING name
                )
                INSERT INTO moderation_history (actor_id,actor,action,reference,reason,justification)
                SELECT actor.id,actor.name,'Membro cadastrado',member.name,$6,$8 FROM member,actor`,
                    [admin.id, admin.name, admin.email, admin.password, admin.role,
                        admin.role === 'SUPER_ADMIN' ? 'Administrador' : 'Moderador', audit.actorId, audit.justification]);
                if (!result.rowCount) throw new Error('FORBIDDEN');
                return;
            }
            await transaction(async db => {
                await db.query('LOCK TABLE administrators IN SHARE ROW EXCLUSIVE MODE');
                const { rowCount } = await db.query("SELECT 1 FROM administrators WHERE role='SUPER_ADMIN' LIMIT 1");
                if (rowCount || admin.role !== 'SUPER_ADMIN') throw new Error('Já existe uma administração ou a função inicial é inválida.');
                await db.query('INSERT INTO administrators (id,name,email,"hashPassword",role) VALUES ($1,$2,$3,$4,$5)',
                    [admin.id, admin.name, admin.email, admin.password, admin.role]);
                await db.query(`INSERT INTO moderation_history(actor_id,actor,action,reference,reason,justification)
                    VALUES ($1,$2,'Membro cadastrado',$2,'Administrador','Criação local do primeiro administrador.')`, [admin.id,admin.name]);
            });
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

    async update(id: string, data: AdminUpdateData, audit: AdminAudit): Promise<void> {
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

        await transaction(async db => {
            const { actor, target } = await lockMembers(db, audit.actorId, id);
            const changesAccess = data.role !== undefined || data.active !== undefined;
            if (actor.id === id && changesAccess) throw new ModerationError(400, 'Outro administrador deve revisar as suas permissões.');
            if (actor.role !== 'SUPER_ADMIN' && data.email !== undefined) throw new ModerationError(403, 'Permissão insuficiente.');
            await db.query(`UPDATE administrators SET ${fields.join(', ')} WHERE id = $${values.length + 1}`, [...values, id]);
            if (changesAccess || data.password !== undefined || data.email !== undefined)
                await db.query('DELETE FROM refresh_tokens WHERE "adminId"=$1', [id]);
            const reason = changesAccess ? [(data.role ?? target.role) === 'ADMIN' ? 'Moderador' : 'Administrador',
                (data.active ?? target.active) ? 'Ativo' : 'Inativo'].join(' · ') : 'Atualização cadastral';
            await db.query(`INSERT INTO moderation_history(actor_id,actor,action,reference,reason,justification) VALUES ($1,$2,$3,$4,$5,$6)`,
                [actor.id,actor.name,changesAccess ? 'Permissão alterada' : 'Dados da equipe atualizados',target.name,reason,audit.justification]);
        });
    }

    async delete(id: string, audit: AdminAudit): Promise<void> {
        await transaction(async db => {
            const { actor, target } = await lockMembers(db, audit.actorId, id);
            if (actor.role !== 'SUPER_ADMIN' || target.role === 'SUPER_ADMIN' || target.id === actor.id)
                throw new ModerationError(403, 'Esta conta administrativa está protegida contra exclusão.');
            await db.query('DELETE FROM refresh_tokens WHERE "adminId"=$1', [id]);
            await db.query('DELETE FROM administrators WHERE id=$1', [id]);
            await db.query(`INSERT INTO moderation_history(actor_id,actor,action,reference,reason,justification)
                VALUES ($1,$2,'Membro excluído',$3,'Remoção da equipe',$4)`, [actor.id,actor.name,target.name,audit.justification]);
        });
    }
}
