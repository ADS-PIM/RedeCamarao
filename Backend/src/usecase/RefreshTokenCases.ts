import { UseCase } from './useCase';
import { RefreshTokenInterface } from '../dominio/interfaces/RefreshTokenDAOInterface';

export class CreateRefreshToken implements UseCase<{ id: string, token: string, adminId: string, expiresAt: Date }, null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(data: { id: string, token: string, adminId: string, expiresAt: Date }): Promise<null> {
        await this.refreshTokenDAO.create(data.id, data.token, data.adminId, data.expiresAt);
        return null;
    }
}

export class FindByToken implements UseCase<string, any> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}

    public async execute(token: string): Promise<any> {
        return await this.refreshTokenDAO.findByToken(token);
    }
}

export class DeleteByToken implements UseCase<string, null> {
    constructor(private readonly refreshTokenDAO: RefreshTokenInterface) {}
    public async execute(token: string): Promise<null> {
        await this.refreshTokenDAO.deleteByToken(token);
        return null;
    }
}
