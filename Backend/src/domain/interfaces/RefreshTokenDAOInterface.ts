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

export interface ConsumableRefreshTokenInterface extends RefreshTokenInterface {
    // Returns a valid token and invalidates it in the same transaction.
    consume(token: string): Promise<RefreshTokenRow | null>
}
