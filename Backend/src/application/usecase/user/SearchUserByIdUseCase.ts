import { User } from '../../../domain/model/user';

import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';

import { UseCase } from '../useCase';

export class SearchByIdUser implements UseCase<string, User | null> {

    constructor(
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute(id: string): Promise<User | null> {

        const user = await this.userDAO.searchById(id);

        return user;
    }
}