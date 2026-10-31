import { UserRefreshTokenDAOInterface } from '../../../domain/interfaces/user/UserRefreshTokenDAOInterface';
import { UseCase } from '../useCase';

export class RevokeAllUserRefreshTokens implements UseCase<string, void> {

    constructor(
        private readonly userRefreshTokenDAO: UserRefreshTokenDAOInterface
    ) {}

    public async execute(userId: string): Promise<void> {

        await this.userRefreshTokenDAO.revokeAll(userId);
    }
}