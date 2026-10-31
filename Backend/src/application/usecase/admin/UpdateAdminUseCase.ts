import { AdminDAOInterface } from "../../../domain/interfaces/admin/AdminDAOInterface";
import { UseCase } from "../useCase";
import { PasswordCrypto } from "../../../service/passwordCrypto";
import { SearchByEmailAdmin } from "../admin/SearchAdminByEmailUseCase";

export class UpdateAdmin implements UseCase<{ id: string, data: any }, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute({ id, data }: { id: string, data: any }): Promise<void> {
        const searchByEmailAdmin = new SearchByEmailAdmin(this.adminDAO);
        if (data.email !== undefined) {
            const adminWithEmail = await searchByEmailAdmin.execute(data.email);
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