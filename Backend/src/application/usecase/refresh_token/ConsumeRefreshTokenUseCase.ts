import { ConsumableRefreshTokenInterface, RefreshTokenRow } from '../../../domain/interfaces/RefreshTokenDAOInterface';
import { UseCase } from '../useCase';

export class ConsumeRefreshToken implements UseCase<string, RefreshTokenRow | null> {
    constructor(private readonly refreshTokenDAO: ConsumableRefreshTokenInterface) {}

    public async execute(token: string): Promise<RefreshTokenRow | null> {
        return await this.refreshTokenDAO.consume(token);
    }
}
