import { UseCase } from '../useCase';
import { RefreshTokenInterface, RefreshTokenRow } from '../../../domain/interfaces/RefreshTokenDAOInterface';

export class FindByToken implements UseCase<string, RefreshTokenRow | null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(token: string): Promise<RefreshTokenRow | null> {
        return await this.refreshTokenDAO.findByToken(token);
    }
}
