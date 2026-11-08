import { UserSearchByIdDTO } from '../../dto/userDTO/UserSearchByIdDTO';

import { UserDAOInterface } from '../../../domain/interfaces/user/UserDAOInterface';

import { UseCase } from '../useCase';

export class SearchByIdUser implements UseCase<string, UserSearchByIdDTO | null> {

    constructor(
        private readonly userDAO: UserDAOInterface
    ) {}

    public async execute(id: string): Promise<UserSearchByIdDTO | null> {

        const user = await this.userDAO.searchById(id);

        if (!user) return null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.userType,
            description: user.description,
            location: user.location,
            phone: user.phone,
            businessHours: user.businessHours,
            createdAt: user.createdAt
        };
    }
}
