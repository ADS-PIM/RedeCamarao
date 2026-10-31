import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface'
import { UseCase } from '../useCase'
import { SearchByIdUser } from './SearchUserByIdUseCase'

export class DeleteUser implements UseCase<string, void> {
    constructor(private readonly userDAO: UserDAOInterface) {}

    public async execute(id: string): Promise<void> {
        const searchByIdUser = new SearchByIdUser(this.userDAO)
        const existingUser = await searchByIdUser.execute(id)

        if (!existingUser) {
            throw new Error('User not found')
        }

        await this.userDAO.delete(id)
    }
}