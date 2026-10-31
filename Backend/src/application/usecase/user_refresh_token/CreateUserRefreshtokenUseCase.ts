import { UserRefreshTokenDAOInterface } from '../../../domain/interfaces/user/UserRefreshTokenDAOInterface';
import { UseCase } from '../useCase';

type CreateUserRefreshTokenInput = {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
};

export class CreateUserRefreshToken implements UseCase<CreateUserRefreshTokenInput, void> {

    constructor(
        private readonly userRefreshTokenDAO: UserRefreshTokenDAOInterface
    ) {}

    public async execute({
        userId,
        tokenHash,
        expiresAt
    }: CreateUserRefreshTokenInput): Promise<void> {

        await this.userRefreshTokenDAO.create(
            userId,
            tokenHash,
            expiresAt
        );
    }
}