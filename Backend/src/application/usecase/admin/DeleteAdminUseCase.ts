import { AdminDAOInterface } from "../../../domain/interfaces/admin/AdminDAOInterface";
import { UseCase } from "../useCase";
import { SearchByIdAdmin } from "./SearchAdminByIdUseCase";

export class DeleteAdmin implements UseCase<string, void> {
    constructor(private readonly adminDAO: AdminDAOInterface) {}

    public async execute(id: string): Promise<void> {
        const searchByIdAdmin = new SearchByIdAdmin(this.adminDAO);
        const admin = await searchByIdAdmin.execute(id);

        if (!admin) {
            throw new Error('Admin not found');
        }

        if (admin.role === 'SUPER_ADMIN') {
            throw new Error('Cannot delete SUPER_ADMIN');
        }
        await this.adminDAO.delete(id);
    }
}