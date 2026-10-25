import { Admin } from "../dominio/model/admin";
import { AdminDAOInterface } from "../dominio/interfaces/AdminDAOInterface";
import { AdminCreateDTO } from "../dto/AdminInputDTO";
import { UseCase } from "./useCase";
import { PasswordCrypto } from "../service/passwordCrypto";

export class CreateAdmin implements UseCase<AdminCreateDTO, null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(adminCreateDTO: AdminCreateDTO): Promise<any> {
        try {
            const searchByEmailAdmin = new SearchByEmailAdmin(this.adminDAO);

            if (!adminCreateDTO.name || !adminCreateDTO.email || !adminCreateDTO.password || !adminCreateDTO.role) {
                throw new Error('Missing required fields');
            }

            if (await searchByEmailAdmin.execute(adminCreateDTO.email)) {
                throw new Error('Email already registered');
            }

            adminCreateDTO.password = await PasswordCrypto.hashPassword(adminCreateDTO.password);
            const admin = Admin.construct(adminCreateDTO);

            await this.adminDAO.register(admin);
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }
}

export class SearchByEmailAdmin implements UseCase<string, Admin | null>{
    constructor(private readonly adminDAO: AdminDAOInterface){}

    public async execute(email: string): Promise<Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchByEmail(email);
        return admin ? Admin.reconstruct(admin) : null;
    }
}
