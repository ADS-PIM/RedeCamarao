import { UseCase } from '../useCase';
import { RefreshTokenInterface } from '../../../domain/interfaces/RefreshTokenDAOInterface';

export class FindByToken implements UseCase<string, any> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(token: string): Promise<any> {
        return await this.refreshTokenDAO.findByToken(token);
    }
}