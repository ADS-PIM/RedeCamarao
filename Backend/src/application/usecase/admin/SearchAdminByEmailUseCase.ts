import { Admin } from "../../../domain/model/admin";
import { AdminDAOInterface } from "../../../domain/interfaces/AdminDAOInterface";
import { UseCase } from "../useCase";

export class SearchByEmailAdmin implements UseCase<string, Admin | null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(email: string): Promise<Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchByEmail(email);
        return admin ? Admin.reconstruct(admin) : null;
    }
}