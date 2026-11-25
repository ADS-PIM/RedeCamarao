export type RefreshTokenRow = {
    id: string;
    // Tokens opacos de usuário precisam identificar o titular no banco.
    userId?: string;
}


export interface RefreshTokenInterface {
    create (id: string, token: string, userId: string, expiresAt: Date): Promise<void>
    findByToken(token: string): Promise<RefreshTokenRow | null>
    deleteByToken(token: string): Promise<void>
    deleteByUserId(userId: string): Promise<void>
}

export type RefreshTokenRotation = {
    previousToken: string;
    previousId: string;
    ownerId: string;
    id: string;
    token: string;
    expiresAt: Date;
}

export interface RotatingRefreshTokenInterface extends RefreshTokenInterface {
    rotate(rotation: RefreshTokenRotation): Promise<{ id: string; expiresAt: Date } | null>
}
