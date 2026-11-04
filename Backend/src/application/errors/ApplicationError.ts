export type ApplicationErrorCode =
    | 'INVALID_DATA'
    | 'INVALID_QUANTITY_RANGE'
    | 'INVALID_DATE_RANGE'
    | 'USER_NOT_FOUND'
    | 'OFFER_NOT_FOUND'
    | 'FORBIDDEN'
    | 'EMAIL_ALREADY_EXISTS'
    | 'OFFER_UPDATE_CONFLICT';

export class ApplicationError extends Error {
    constructor(public readonly code: ApplicationErrorCode, message: string) {
        super(message);
        this.name = 'ApplicationError';
    }
}
