import type { Response } from 'express';
import { ApplicationError, ApplicationErrorCode } from '../../../application/errors/ApplicationError';

const statusByCode: Record<ApplicationErrorCode, number> = {
    INVALID_DATA: 400,
    INVALID_QUANTITY_RANGE: 400,
    INVALID_DATE_RANGE: 400,
    USER_NOT_FOUND: 404,
    OFFER_NOT_FOUND: 404,
    FORBIDDEN: 403,
    EMAIL_ALREADY_EXISTS: 409,
    OFFER_UPDATE_CONFLICT: 409
};

export function applicationErrorResponse(error: unknown, res: Response): Response | undefined {
    if (error instanceof ApplicationError) {
        return res.status(statusByCode[error.code]).json({ error: error.message });
    }
    return undefined;
}
