import { RefreshTokenInterface } from '../../../domain/interfaces/RefreshTokenDAOInterface';
import { UseCase } from '../useCase';

export class DeleteByUserId implements UseCase<string, void> {

    constructor(
        private readonly refreshTokenDAO: RefreshTokenInterface
    ) {}

    public async execute(userId: string): Promise<void> {

        await this.refreshTokenDAO.deleteByUserId(userId);
    }
}
