export interface UserRefreshTokenDAOInterface {
    create(userId: string,tokenHash: string,expiresAt: Date): Promise<void>;
    consume(tokenHash: string): Promise<string | null>;
    revoke(tokenHash: string): Promise<void>;
    revokeAll(userId: string): Promise<void>;
}