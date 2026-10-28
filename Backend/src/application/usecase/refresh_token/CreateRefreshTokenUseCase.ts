import { UseCase } from '../useCase';
import { RefreshTokenInterface } from '../../../domain/interfaces/RefreshTokenDAOInterface';

export class CreateRefreshToken implements UseCase<{ id: string, token: string, adminId: string, expiresAt: Date }, null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(data: { id: string, token: string, adminId: string, expiresAt: Date }): Promise<null> {
        await this.refreshTokenDAO.create(data.id, data.token, data.adminId, data.expiresAt);
        return null;
    }
}