import { ApplicationError } from '../../errors/ApplicationError';
import { User } from "../../../domain/model/user";

import { UserDAOInterface } from "../../../domain/interfaces/user/UserDAOInterface";
import { UserCreateDTO } from "../../dto/userDTO/UserCreateDTO";
import { UseCase } from "../useCase";
import { PasswordCrypto } from "../../../service/passwordCrypto";
import { SearchByEmailUser } from "./SearchUserByEmailUseCase";

export class CreateUser implements UseCase<UserCreateDTO, null>{
    constructor(private readonly userDAO: UserDAOInterface){}

    async execute(userCreateDTO: UserCreateDTO): Promise<any> {
        try {
        const searchByEmailUser = new SearchByEmailUser(this.userDAO);

        if (
            !userCreateDTO.name ||
            !userCreateDTO.email ||
            !userCreateDTO.password ||
            !userCreateDTO.userType ||
            !userCreateDTO.cpf_cnpj
        ) {
            throw new ApplicationError('INVALID_DATA', 'dados de usuário inválidos');
        }

        const email = userCreateDTO.email.trim().toLowerCase();
        const existingUser = await searchByEmailUser.execute(email);
        if (existingUser) {
            throw new ApplicationError('EMAIL_ALREADY_EXISTS', 'Usuário com este email já existe');
        }

        userCreateDTO.password = await PasswordCrypto.hashPassword(userCreateDTO.password);
        const user = User.construct(userCreateDTO);
        await this.userDAO.register(user);
        } catch (error: any) {
            if (error instanceof ApplicationError || error.code === 'ER_DUP_ENTRY') throw error;
            throw new Error('Erro registrando usuário: ' + error.message);
        }
    }
}

