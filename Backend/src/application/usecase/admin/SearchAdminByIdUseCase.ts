import { Admin } from "../../../domain/model/admin";
import { AdminDAOInterface } from "../../../domain/interfaces/admin/AdminDAOInterface";
import { UseCase } from "../useCase";

export class SearchByIdAdmin implements UseCase<string, Admin | null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(id: string): Promise<Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchById(id);
        return admin ? Admin.reconstruct(admin) : null;
    }
}