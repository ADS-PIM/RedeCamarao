import { ApplicationError } from '../../errors/ApplicationError';
import { UserDAOInterface, UserUpdateData } from "../../../domain/interfaces/user/UserDAOInterface";
import { UseCase } from "../useCase";
import { PasswordCrypto } from "../../../service/passwordCrypto";
import { SearchByEmailUser } from "./SearchUserByEmailUseCase";
import { SearchByIdUser } from "./SearchUserByIdUseCase";

export class UpdateUser implements UseCase<{ id: string; data: UserUpdateData }, void> {
    constructor(private readonly userDAO: UserDAOInterface) {}

    public async execute({id, data} : { id: string; data: UserUpdateData }): Promise<void> {
        const searchByIdUser = new SearchByIdUser(this.userDAO);
        const existingUser = await searchByIdUser.execute(id);
        if (!existingUser) {
            throw new ApplicationError('USER_NOT_FOUND', 'Usuário não encontrado');
        }

        if (data.email !== undefined) {
            const searchByEmailUser = new SearchByEmailUser(this.userDAO);
            const userWithEmail = await searchByEmailUser.execute(data.email);
            if (userWithEmail && userWithEmail.id !== id) {
                throw new ApplicationError('EMAIL_ALREADY_EXISTS', 'Email já está em uso');
            }
        }

        const updatedData: UserUpdateData = { ...data };

        if (data.password !== undefined) {
            updatedData.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.userDAO.update(id, updatedData);
    }
}