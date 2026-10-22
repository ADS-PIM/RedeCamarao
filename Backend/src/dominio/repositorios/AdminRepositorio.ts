import { Admin } from '../model/admin'

export interface AdminRepositorio {
    searchById(id: string): Promise<Admin | null>;
    search(): Promise<Admin[]>;
    create(admin: Admin): Promise<void>
    delete(id: string): Promise<boolean>
    update(admin: Admin): Promise<void>
}