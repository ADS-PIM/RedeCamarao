export interface PasswordResetDAOInterface {
    issue(email: string, tokenHash: string): Promise<{ email: string } | null>
    discard(tokenHash: string): Promise<void>
    consume(tokenHash: string, passwordHash: string): Promise<boolean>
}