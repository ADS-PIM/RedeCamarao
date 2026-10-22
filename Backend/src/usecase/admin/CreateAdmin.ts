import { Admin } from "../../dominio/model/admin";
import { AdminRepositorio } from "../../dominio/repositorios/AdminRepositorio";
import { CreateAdminInputDTO } from "../../dto/CreateAdminInputDTO";
import { CreateAdminOutputDTO } from "../../dto/CreateAdminOutputDTO"
import { UseCase } from "../useCase";

export class CreateAdmin implements UseCase<CreateAdminInputDTO, CreateAdminOutputDTO>{
    constructor(private readonly adminRepositorio: AdminRepositorio){}

    public async execute(inputDTO: CreateAdminInputDTO): Promise<CreateAdminOutputDTO> {
        const admin = Admin.create(inputDTO.name, inputDTO.email, inputDTO.password, inputDTO.role, inputDTO.active, inputDTO.createdAt, inputDTO.profile_picture)
        await this.adminRepositorio.create(admin)
        const outputDTO: CreateAdminOutputDTO = {id: admin.id}

        return outputDTO
    }
}
