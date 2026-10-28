import { Admin } from "../../../domain/model/admin";
import { AdminDAOInterface } from "../../../domain/interfaces/AdminDAOInterface";
import { AdminCreateDTO} from "../../dto/adminDTO/AdminCreateDTO";
import { UseCase } from "../useCase";
import { PasswordCrypto } from "../../../service/passwordCrypto";
import { SearchByEmailAdmin } from "../admin/SearchAdminByEmailUseCase";

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