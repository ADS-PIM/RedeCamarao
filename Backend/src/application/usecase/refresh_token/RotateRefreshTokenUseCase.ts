import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { RotatingRefreshTokenInterface } from '../../../domain/interfaces/RefreshTokenDAOInterface';

const lifetimeSeconds = 7 * 24 * 60 * 60;

export class RotateRefreshToken {
    constructor(private readonly dao: RotatingRefreshTokenInterface, private readonly ownerClaim: 'userId' | 'adminId') {}

    async execute(previousToken: string, previousId: string, ownerId: string, secret: string): Promise<string | null> {
        // A retry can reproduce the exact signed cookie from the committed ID and expiry.
        const sign = (id: string, expiresAt: Date) => {
            const exp = Math.floor(expiresAt.getTime() / 1000);
            return jwt.sign({ [this.ownerClaim]: ownerId, iat: exp - lifetimeSeconds, exp }, secret, { jwtid: id });
        };
        const id = randomUUID();
        const expiresAt = new Date((Math.floor(Date.now() / 1000) + lifetimeSeconds) * 1000);
        const token = sign(id, expiresAt);
        const current = await this.dao.rotate({ previousToken, previousId, ownerId, id, expiresAt, token });
        if (!current) return null;
        if (current.id === previousId) return previousToken;
        return current.id === id ? token : sign(current.id, current.expiresAt);
    }
}
