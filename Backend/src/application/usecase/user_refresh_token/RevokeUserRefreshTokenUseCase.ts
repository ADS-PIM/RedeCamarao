import { UserRefreshTokenDAOInterface } from '../../../domain/interfaces/user/UserRefreshTokenDAOInterface';
import { UseCase } from '../useCase';

export class RevokeUserRefreshToken implements UseCase<string, void> {

    constructor(
        private readonly userRefreshTokenDAO: UserRefreshTokenDAOInterface
    ) {}

    public async execute(tokenHash: string): Promise<void> {

        await this.userRefreshTokenDAO.revoke(tokenHash);
    }
}