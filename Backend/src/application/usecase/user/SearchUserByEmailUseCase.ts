import { User } from '../../../domain/model/user';

import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';

import { UseCase } from '../useCase';

export class SearchByEmailUser implements UseCase<string, User | null> {

    constructor(
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute(email: string): Promise<User | null> {

        const user = await this.userDAO.searchByEmail(
            email.trim().toLowerCase()
        );

        return user;
    }
}