import { IsDateString, IsNotEmpty, IsNumber, IsPositive, IsString, Matches, Max, MaxLength } from 'class-validator';

export class OfferCreateDTO {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    description!: string;

    @IsNotEmpty()
    @IsString()

    type!: string;

    @IsNotEmpty()
    @IsString()
    size!: string;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    price!: number;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    weight!: number;

    @IsNotEmpty()
    @IsNumber({ maxDecimalPlaces: 2 })
    maximumQuantity!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Max(99999999.99)
    minimumQuantity!: number;

    @IsNotEmpty()
    @IsString()
    location!: string;

    @IsNotEmpty()
    @IsDateString({ strict: true })
    startDate!: string;

    @IsNotEmpty()
    @IsDateString({ strict: true })
    endDate!: string;
}
