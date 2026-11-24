import { AdminAudit, AdminDAOInterface, AdminUpdateData } from "../../../domain/interfaces/admin/AdminDAOInterface";
import { UseCase } from "../useCase";
import { PasswordCrypto } from "../../../service/passwordCrypto";
import { SearchByEmailAdmin } from "../admin/SearchAdminByEmailUseCase";

type Change = { id: string; data: AdminUpdateData; audit: AdminAudit };

export class UpdateAdmin implements UseCase<Change, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute({ id, data, audit }: Change): Promise<void> {
        const searchByEmailAdmin = new SearchByEmailAdmin(this.adminDAO);
        if (data.email !== undefined) {
            data.email = data.email.trim().toLowerCase();
            const adminWithEmail = await searchByEmailAdmin.execute(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new Error('Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data, audit);
    }
}
