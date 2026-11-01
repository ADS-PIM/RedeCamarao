import { UseCase } from '../useCase';
import { RefreshTokenInterface } from '../../../domain/interfaces/RefreshTokenDAOInterface';

type CreateRefreshTokenInput = {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
};

export class CreateRefreshToken implements UseCase<CreateRefreshTokenInput, null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(data: CreateRefreshTokenInput): Promise<null> {
        await this.refreshTokenDAO.create(data.id, data.token, data.userId, data.expiresAt);
        return null;
    }
}
