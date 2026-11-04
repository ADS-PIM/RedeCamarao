import { isISO8601 } from 'class-validator';
import { ApplicationError } from '../../errors/ApplicationError';

// Availability is a calendar date. Preserve the submitted day even when ISO input includes time/offset.
export function offerDate(value: string): string {
    if (!isISO8601(value, { strict: true }) || !/^[1-9]\d{3}-\d{2}-\d{2}(?:$|T| )/.test(value)) {
        throw new ApplicationError('INVALID_DATA', 'Data de disponibilidade inválida');
    }
    return value.slice(0, 10);
}
