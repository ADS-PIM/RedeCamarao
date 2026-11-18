export type ApplicationErrorCode =
    | 'INVALID_DATA'
    | 'IMAGE_STORAGE_UNAVAILABLE'
    | 'INVALID_QUANTITY_RANGE'
    | 'INVALID_DATE_RANGE'
    | 'USER_NOT_FOUND'
    | 'OFFER_NOT_FOUND'
    | 'OFFER_PHOTO_NOT_FOUND'
    | 'OFFER_PHOTO_WRITE_CONFLICT'
    | 'FORBIDDEN'
    | 'EMAIL_ALREADY_EXISTS'
    | 'OFFER_UPDATE_CONFLICT'
    | 'OFFER_DELETE_CONFLICT';

export class ApplicationError extends Error {
    constructor(public readonly code: ApplicationErrorCode, message: string) {
        super(message);
        this.name = 'ApplicationError';
    }
}
