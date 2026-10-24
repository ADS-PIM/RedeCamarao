import { AdminSearchByIdDTO, AdminSearchDTO } from '../../dto/AdminCreateInputDTO';
import { Admin } from '../model/admin'

export type AdminUpdateData = {
    name?: string;
    email?: string;
    password?: string;
    role?: Admin['role'];
    active?: boolean;
    profile_picture?: string | null;
}

export interface AdminDAOInterface {
    register(admin: Admin): Promise<void>
    searchByEmail(email: string): Promise<Admin | null>
    searchById(id: string): Promise<Admin | null>
    searchPublicById(id: string): Promise<AdminSearchByIdDTO | null>
    searchAll(): Promise<AdminSearchDTO[] | null>
    update(id: string, data: AdminUpdateData): Promise<void>
    delete(id: string): Promise<void>
}