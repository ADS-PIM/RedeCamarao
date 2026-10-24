import { Admin } from "../../dominio/model/admin";
import { AdminDAOInterface } from "../../dominio/interfaces/AdminDAOInterface";
import { AdminCreateDTO } from "../../dto/AdminCreateInputDTO";
import { CreateAdminOutputDTO } from "../../dto/AdminCreateOutputDTO"
import { UseCase } from "../useCase";

export class CreateAdmin implements UseCase<AdminCreateDTO, CreateAdminOutputDTO>{
    constructor(private readonly adminDAOInterface: AdminDAOInterface){}

    public async execute(inputDTO: AdminCreateDTO): Promise<CreateAdminOutputDTO> {
        const admin = Admin.construct({name: inputDTO.name, email: inputDTO.email, password: inputDTO.password, role: inputDTO.role, active: inputDTO.active, profile_picture: inputDTO.profile_picture})
        await this.adminDAOInterface.register(admin)
        const outputDTO: CreateAdminOutputDTO = {id: admin.id}

        return outputDTO
    }
}
