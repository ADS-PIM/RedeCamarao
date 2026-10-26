export type RefreshTokenRow = {
    id: string;
}


export interface RefreshTokenInterface {
    create (id: string, token: string, adminId: string, expiresAt: Date): Promise<void>
    findByToken(token: string): Promise<RefreshTokenRow | null>
    deleteByToken(token: string): Promise<void>
    deleteByUserId(userId: string): Promise<void>
}