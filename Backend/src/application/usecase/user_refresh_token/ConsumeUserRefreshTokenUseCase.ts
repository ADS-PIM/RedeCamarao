import { UserRefreshTokenDAOInterface } from '../../../domain/interfaces/user/UserRefreshTokenDAOInterface';
import { UseCase } from '../useCase';

export class ConsumeUserRefreshToken implements UseCase<string, string | null> {

    constructor(
        private readonly userRefreshTokenDAO: UserRefreshTokenDAOInterface
    ) {}

    public async execute(tokenHash: string): Promise<string | null> {

        return await this.userRefreshTokenDAO.consume(tokenHash);
    }
}