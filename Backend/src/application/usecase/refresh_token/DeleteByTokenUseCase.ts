import { UseCase } from '../useCase';
import { RefreshTokenInterface } from '../../../domain/interfaces/admin/RefreshTokenDAOInterface';

export class DeleteByToken implements UseCase<string, null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}
    public async execute(token: string): Promise<null> {
        await this.refreshTokenDAO.deleteByToken(token);
        return null;
    }
}