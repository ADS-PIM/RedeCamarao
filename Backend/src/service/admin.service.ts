import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/AdminInputDTO";
import { Admin } from "../dominio/model/admin";
import { PasswordCrypto } from './passwordCrypto';
import { AdminDAOInterface, AdminUpdateData } from '../dominio/interfaces/AdminDAOInterface';

export class AdminService {
    public constructor(private adminDAO: AdminDAOInterface) {}
//Vou começar a retirar os métodos que já existem no usecase, para não ter duplicidade de código. O service vai ser usado apenas para manter nota do que ainda não está implementado nos usecases.

    public async delete(id: string): Promise<void> {
        const admin = await this.searchById(id);
        if (!admin) {
            throw new Error('Admin not found');
        }

        if (admin.role === 'SUPER_ADMIN') {
            throw new Error('Cannot delete SUPER_ADMIN');
        }
        await this.adminDAO.delete(id);
    }

    public async searchById(id: string): Promise<Admin | null> {
        const admin = await this.adminDAO.searchById(id);
        return admin ? Admin.reconstruct(admin) : null;
    }

    public async searchPublicById(id: string): Promise<AdminSearchByIdDTO | null> {
        return this.adminDAO.searchPublicById(id);
    }

    public async searchAll(): Promise<AdminSearchDTO[] | null> {
        const admins = await this.adminDAO.searchAll();
        return admins;
    }

    public async update(id: string, data: AdminUpdateData): Promise<void> {
        if (data.email !== undefined) {
            const adminWithEmail = await this.searchByEmail(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new Error('Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data);
    }
}