import { IsDateString, IsEnum, IsNumber, Max, MaxLength, Min, ValidateIf, IsString } from 'class-validator';
import { OfferStatus } from '../../../domain/model/offer';
import { OfferUpdateData } from '../../../domain/interfaces/offer/OfferDAOInterface';

export class OfferUpdateDTO implements OfferUpdateData {
    @ValidateIf((_object, value) => value !== undefined)
    @IsString()
    title?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsString()
    description?: string;

    @ValidateIf((_object, value) => value !== undefined && value !== null)
    @IsString()
    type?: string | null;

    @ValidateIf((_object, value) => value !== undefined)
    @IsString()
    size?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 })
    price?: number;

    @ValidateIf((_object, value) => value !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 })
    weight?: number;

    @ValidateIf((_object, value) => value !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 })
    maximumQuantity?: number;

    @ValidateIf((_object, value) => value !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 })
    minimumQuantity?: number;

    @ValidateIf((_object, value) => value !== undefined)
    @IsString()
    location?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsDateString()
    startDate?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsDateString()
    endDate?: string;

    @ValidateIf((_object, value) => value !== undefined)
    @IsEnum(OfferStatus, { message: `status must be one of the following values: ${Object.values(OfferStatus).join(', ')}` })
    status?: OfferUpdateData['status'];
}
