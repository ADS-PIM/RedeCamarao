import { AdminSearchByIdDTO } from '../../../application/dto/adminDTO/AdminSearchByIdDTO';
import { AdminSearchDTO } from '../../../application/dto/adminDTO/AdminSearchDTO';
import { Admin } from '../../model/admin'

export type AdminAudit = { actorId: string; justification: string }

export type AdminUpdateData = {
    name?: string;
    email?: string;
    password?: string;
    role?: Admin['role'];
    active?: boolean;
    profile_picture?: string | null;
}

export interface AdminDAOInterface {
    register(admin: Admin, audit?: AdminAudit): Promise<void>
    searchByEmail(email: string): Promise<Admin | null>
    searchById(id: string): Promise<Admin | null>
    searchPublicById(id: string): Promise<AdminSearchByIdDTO | null>
    searchAll(): Promise<AdminSearchDTO[] | null>
    update(id: string, data: AdminUpdateData, audit: AdminAudit): Promise<void>
    delete(id: string, audit: AdminAudit): Promise<void>
}
